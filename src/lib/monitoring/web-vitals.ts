'use client'

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import { capturePerformance } from './error-monitoring'

export interface WebVitalsReport {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  timestamp: Date
  url: string
}

// Web Vitals thresholds based on Google recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
}

// Rate web vitals performance
function getRating(name: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

// Enhanced web vitals reporting
function reportWebVitals(metric: any) {
  const report: WebVitalsReport = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name as keyof typeof THRESHOLDS, metric.value),
    delta: metric.delta,
    id: metric.id,
    timestamp: new Date(),
    url: window.location.href,
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const emoji = report.rating === 'good' ? '✅' : report.rating === 'needs-improvement' ? '⚠️' : '❌'
    console.log(`${emoji} ${report.name}: ${report.value.toFixed(2)} (${report.rating})`)
  }

  // Send to monitoring service
  capturePerformance({
    name: `web_vital_${metric.name.toLowerCase()}`,
    value: metric.value,
    unit: metric.name === 'CLS' ? 'count' : 'ms',
    timestamp: report.timestamp,
    context: {
      rating: report.rating,
      delta: report.delta,
      id: report.id,
      url: report.url,
    },
  })

  // Send to analytics if performance is poor
  if (report.rating === 'poor') {
    console.warn(`🚨 Poor ${report.name} performance: ${report.value}`)
    
    // Could trigger alerts or special handling for poor performance
    if (typeof window !== 'undefined') {
      const poorMetrics = JSON.parse(localStorage.getItem('poor_web_vitals') || '[]')
      poorMetrics.push(report)
      localStorage.setItem('poor_web_vitals', JSON.stringify(poorMetrics))
    }
  }
}

// Initialize Web Vitals monitoring
export function initializeWebVitalsMonitoring() {
  if (typeof window === 'undefined') return

  try {
    // Measure all Core Web Vitals
    getCLS(reportWebVitals)
    getFID(reportWebVitals)
    getFCP(reportWebVitals)
    getLCP(reportWebVitals)
    getTTFB(reportWebVitals)

    console.log('📊 Web Vitals monitoring initialized')
  } catch (error) {
    console.warn('Failed to initialize Web Vitals monitoring:', error)
  }
}

// Custom performance monitoring
export class CustomPerformanceMonitor {
  private static instance: CustomPerformanceMonitor
  private observers: PerformanceObserver[] = []

  public static getInstance(): CustomPerformanceMonitor {
    if (!this.instance) {
      this.instance = new CustomPerformanceMonitor()
    }
    return this.instance
  }

  // Monitor navigation timing
  monitorNavigation() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            
            // Calculate key metrics
            const metrics = {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              domInteractive: navEntry.domInteractive - navEntry.navigationStart,
              responseStart: navEntry.responseStart - navEntry.navigationStart,
              responseEnd: navEntry.responseEnd - navEntry.navigationStart,
            }

            Object.entries(metrics).forEach(([name, value]) => {
              if (value > 0) {
                capturePerformance({
                  name: `navigation_${name}`,
                  value,
                  unit: 'ms',
                  timestamp: new Date(),
                })
              }
            })
          }
        }
      })

      observer.observe({ entryTypes: ['navigation'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Navigation timing monitoring failed:', error)
    }
  }

  // Monitor resource loading
  monitorResources() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const resource = entry as PerformanceResourceTiming
          
          // Monitor slow resources (>2 seconds)
          if (resource.duration > 2000) {
            capturePerformance({
              name: 'slow_resource',
              value: resource.duration,
              unit: 'ms',
              timestamp: new Date(),
              context: {
                url: resource.name,
                type: resource.initiatorType,
                size: resource.transferSize || 0,
              },
            })
          }

          // Monitor large resources (>1MB)
          if (resource.transferSize && resource.transferSize > 1024 * 1024) {
            capturePerformance({
              name: 'large_resource',
              value: resource.transferSize,
              unit: 'bytes',
              timestamp: new Date(),
              context: {
                url: resource.name,
                type: resource.initiatorType,
                duration: resource.duration,
              },
            })
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Resource monitoring failed:', error)
    }
  }

  // Monitor layout shifts
  monitorLayoutShifts() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShift = entry as any
          
          // Only report significant layout shifts
          if (layoutShift.value > 0.1) {
            capturePerformance({
              name: 'significant_layout_shift',
              value: layoutShift.value,
              unit: 'count',
              timestamp: new Date(),
              context: {
                hadRecentInput: layoutShift.hadRecentInput,
                sources: layoutShift.sources?.length || 0,
              },
            })
          }
        }
      })

      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Layout shift monitoring failed:', error)
    }
  }

  // Monitor paint timing
  monitorPaint() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          capturePerformance({
            name: entry.name.replace('-', '_'),
            value: entry.startTime,
            unit: 'ms',
            timestamp: new Date(),
          })
        }
      })

      observer.observe({ entryTypes: ['paint'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Paint timing monitoring failed:', error)
    }
  }

  // Custom timing measurement
  measureCustomTiming(name: string, startMark: string, endMark?: string) {
    try {
      if (!endMark) {
        endMark = `${startMark}_end`
        performance.mark(endMark)
      }

      performance.measure(name, startMark, endMark)
      
      const entries = performance.getEntriesByName(name, 'measure')
      if (entries.length > 0) {
        const entry = entries[entries.length - 1]
        
        capturePerformance({
          name: `custom_${name}`,
          value: entry.duration,
          unit: 'ms',
          timestamp: new Date(),
        })
      }
    } catch (error) {
      console.warn('Custom timing measurement failed:', error)
    }
  }

  // Initialize all monitoring
  initializeAll() {
    this.monitorNavigation()
    this.monitorResources()
    this.monitorLayoutShifts()
    this.monitorPaint()
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Export singleton
export const performanceMonitor = CustomPerformanceMonitor.getInstance()

// Initialize everything
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return

  // Initialize Web Vitals
  initializeWebVitalsMonitoring()
  
  // Initialize custom performance monitoring
  performanceMonitor.initializeAll()

  // Monitor memory leaks
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory
      const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100

      if (memoryUsage > 90) {
        capturePerformance({
          name: 'high_memory_usage',
          value: memoryUsage,
          unit: 'percentage',
          timestamp: new Date(),
          context: {
            usedJSHeapSize: memory.usedJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            totalJSHeapSize: memory.totalJSHeapSize,
          },
        })
      }
    }, 30000) // Check every 30 seconds
  }

  console.log('🚀 Performance monitoring fully initialized')
}