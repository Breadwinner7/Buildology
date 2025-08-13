import React, { memo, useMemo, useCallback, useState, useEffect, lazy } from 'react'
import type { ComponentType } from 'react'

// Debounce hook for search inputs and API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const [lastRan, setLastRan] = useState(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan >= limit) {
        setThrottledValue(value)
        setLastRan(Date.now())
      }
    }, limit - (Date.now() - lastRan))

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit, lastRan])

  return throttledValue
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): IntersectionObserverEntry | undefined {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  useEffect(() => {
    if (!ref?.current) return

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    )

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [ref, options.threshold, options.root, options.rootMargin])

  return entry
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length)
  const visibleItems = items.slice(startIndex, endIndex)

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }, []),
  }
}

// Memoization utilities
export const createMemoComponent = <P extends Record<string, any>>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  const MemoizedComponent = memo(Component, propsAreEqual)
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`
  return MemoizedComponent
}

// Complex calculation memoization
export function useExpensiveCalculation<T, R>(
  calculate: (data: T) => R,
  dependencies: T,
  shouldRecalculate?: (prev: T, next: T) => boolean
): R {
  return useMemo(() => {
    console.log('🧮 Running expensive calculation...')
    const start = performance.now()
    const result = calculate(dependencies)
    const end = performance.now()
    console.log(`✅ Calculation completed in ${(end - start).toFixed(2)}ms`)
    return result
  }, [dependencies, shouldRecalculate])
}

// Stable callback hook to prevent unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  return useCallback(callback, [])
}

// Component lazy loading with error boundary
export function createLazyComponent(
  factory: () => Promise<{ default: ComponentType<any> }>,
  displayName?: string
) {
  const LazyComponent = lazy(factory)
  
  if (displayName) {
    LazyComponent.displayName = displayName
  }

  return LazyComponent
}

// Bundle splitting utilities
export const lazyComponents = {
  // Heavy dashboard components
  ProjectFinancialDashboard: createLazyComponent(
    () => import('@/components/financials/ProjectFinancialDashboard'),
    'ProjectFinancialDashboard'
  ),
  
  // Complex forms
  DocumentUploadForm: createLazyComponent(
    () => import('@/components/features/documents/SmartDocumentUpload'),
    'DocumentUploadForm'
  ),
  
  // Charts and analytics
  InsuranceAnalytics: createLazyComponent(
    () => import('@/components/charts/InsuranceAnalytics'),
    'InsuranceAnalytics'
  ),
  
  // Admin components
  AdminUsersTable: createLazyComponent(
    () => import('@/components/admin/AdminUsersTable'),
    'AdminUsersTable'
  ),
  
  // Reports
  ReportingDashboard: createLazyComponent(
    () => import('@/components/reports/ReportingDashboard'),
    'ReportingDashboard'
  ),
}

// Image optimization utilities
export function getOptimizedImageProps(
  src: string,
  alt: string,
  width?: number,
  height?: number
) {
  return {
    src,
    alt,
    width,
    height,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    style: {
      maxWidth: '100%',
      height: 'auto',
    },
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private marks: Map<string, number> = new Map()

  public static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor()
    }
    return this.instance
  }

  // Mark start of operation
  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  // Measure and log duration
  measure(name: string, logToConsole = true): number {
    const start = this.marks.get(name)
    if (!start) {
      console.warn(`No start mark found for: ${name}`)
      return 0
    }

    const duration = performance.now() - start
    this.marks.delete(name)

    if (logToConsole) {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  // Measure React component render time
  measureRender<P>(Component: ComponentType<P>, displayName?: string) {
    const monitor = this
    const WrappedComponent = (props: P) => {
      const name = displayName || Component.displayName || Component.name
      
      useEffect(() => {
        monitor.mark(`${name}-render-start`)
        return () => {
          monitor.measure(`${name}-render-start`)
        }
      })

      return React.createElement(Component, props)
    }

    WrappedComponent.displayName = `PerformanceMonitor(${displayName || Component.displayName || Component.name})`
    return WrappedComponent
  }

  // Monitor API call performance
  async measureAsync<T>(name: string, asyncOperation: () => Promise<T>): Promise<T> {
    this.mark(name)
    try {
      const result = await asyncOperation()
      this.measure(name)
      return result
    } catch (error) {
      this.measure(name)
      throw error
    }
  }

  // Get performance metrics
  getMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstContentfulPaint: this.getFCP(),
      largestContentfulPaint: this.getLCP(),
    }
  }

  private getFCP(): number {
    const entries = performance.getEntriesByName('first-contentful-paint')
    return entries.length > 0 ? entries[0].startTime : 0
  }

  private getLCP(): number {
    return new Promise((resolve) => {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        resolve(lastEntry.startTime)
      }).observe({ entryTypes: ['largest-contentful-paint'] })
    }) as any
  }
}

// Export singleton
export const performanceMonitor = PerformanceMonitor.getInstance()

// HOC for performance monitoring
export function withPerformanceMonitoring<P extends Record<string, any>>(
  Component: ComponentType<P>,
  name?: string
) {
  const monitoredComponent = performanceMonitor.measureRender(Component, name)
  return createMemoComponent(monitoredComponent)
}

// Web Vitals tracking
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 ${metric.name}: ${metric.value}`)
  }

  // In production, send to analytics service
  // Example: gtag('event', metric.name, { value: metric.value })
}