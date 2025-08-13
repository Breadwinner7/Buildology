// Real-time system monitoring for production insurance platform
export interface SystemMetrics {
  timestamp: Date
  cpu?: number
  memory?: {
    used: number
    total: number
    percentage: number
  }
  network?: {
    requests: number
    errors: number
    responseTime: number
  }
  database?: {
    connections: number
    queries: number
    slowQueries: number
    responseTime: number
  }
  storage?: {
    used: number
    total: number
    percentage: number
  }
}

export interface Alert {
  id: string
  type: 'performance' | 'error' | 'security' | 'business'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: Date
  resolved?: boolean
  resolvedAt?: Date
}

class SystemMonitor {
  private static instance: SystemMonitor
  private metrics: SystemMetrics[] = []
  private alerts: Alert[] = []
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout
  private metricsHistory = 100 // Keep last 100 metrics
  
  // Thresholds for alerting
  private thresholds = {
    memory: 85, // 85% memory usage
    cpu: 80,    // 80% CPU usage
    responseTime: 5000, // 5 seconds response time
    errorRate: 5, // 5% error rate
    diskUsage: 90 // 90% disk usage
  }

  private constructor() {
    this.initialize()
  }

  public static getInstance(): SystemMonitor {
    if (!this.instance) {
      this.instance = new SystemMonitor()
    }
    return this.instance
  }

  private initialize() {
    // Start monitoring in browser
    if (typeof window !== 'undefined') {
      this.startClientSideMonitoring()
    }
    
    // Server-side monitoring would be handled differently
    if (typeof process !== 'undefined') {
      this.startServerSideMonitoring()
    }
  }

  // Client-side monitoring
  private startClientSideMonitoring() {
    // Monitor browser performance
    this.monitoringInterval = setInterval(() => {
      this.collectClientMetrics()
    }, 30000) // Every 30 seconds

    // Monitor network requests
    this.monitorNetworkRequests()
    
    // Monitor memory leaks
    this.monitorMemoryLeaks()
    
    console.log('🖥️  Client-side system monitoring started')
  }

  // Server-side monitoring
  private startServerSideMonitoring() {
    if (typeof process === 'undefined') return

    // Monitor server resources
    this.monitoringInterval = setInterval(() => {
      this.collectServerMetrics()
    }, 60000) // Every minute for server metrics

    console.log('🖥️  Server-side system monitoring started')
  }

  // Collect client-side metrics
  private async collectClientMetrics() {
    if (typeof window === 'undefined') return

    const metrics: SystemMetrics = {
      timestamp: new Date()
    }

    // Memory metrics (Chrome only)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      metrics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }

      // Alert on high memory usage
      if (metrics.memory.percentage > this.thresholds.memory) {
        this.createAlert({
          type: 'performance',
          severity: 'high',
          title: 'High Memory Usage',
          description: `Memory usage at ${metrics.memory.percentage.toFixed(1)}%`
        })
      }
    }

    // Connection monitoring
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      metrics.network = {
        requests: this.getRequestCount(),
        errors: this.getErrorCount(),
        responseTime: this.getAverageResponseTime()
      }

      // Monitor connection quality
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.createAlert({
          type: 'performance',
          severity: 'medium',
          title: 'Slow Network Connection',
          description: `Connection type: ${connection.effectiveType}`
        })
      }
    }

    // Storage monitoring
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.quota && estimate.usage) {
          metrics.storage = {
            used: estimate.usage,
            total: estimate.quota,
            percentage: (estimate.usage / estimate.quota) * 100
          }

          // Alert on high storage usage
          if (metrics.storage.percentage > this.thresholds.diskUsage) {
            this.createAlert({
              type: 'performance',
              severity: 'medium',
              title: 'High Storage Usage',
              description: `Storage usage at ${metrics.storage.percentage.toFixed(1)}%`
            })
          }
        }
      } catch (error) {
        console.warn('Storage estimation not available:', error)
      }
    }

    this.addMetrics(metrics)
  }

  // Collect server-side metrics
  private collectServerMetrics() {
    if (typeof process === 'undefined') return

    const metrics: SystemMetrics = {
      timestamp: new Date()
    }

    // Memory metrics
    const memoryUsage = process.memoryUsage()
    metrics.memory = {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    }

    // CPU metrics (simplified)
    const cpuUsage = process.cpuUsage()
    metrics.cpu = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to percentage approximation

    // Alert on high resource usage
    if (metrics.memory.percentage > this.thresholds.memory) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        title: 'High Server Memory Usage',
        description: `Memory usage at ${metrics.memory.percentage.toFixed(1)}%`
      })
    }

    this.addMetrics(metrics)
  }

  // Monitor network requests
  private monitorNetworkRequests() {
    if (typeof window === 'undefined') return

    let requestCount = 0
    let errorCount = 0
    let totalResponseTime = 0

    // Intercept fetch requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = Date.now()
      requestCount++

      try {
        const response = await originalFetch(...args)
        const responseTime = Date.now() - startTime
        totalResponseTime += responseTime

        if (!response.ok) {
          errorCount++
        }

        // Alert on slow responses
        if (responseTime > this.thresholds.responseTime) {
          this.createAlert({
            type: 'performance',
            severity: 'medium',
            title: 'Slow API Response',
            description: `Request took ${responseTime}ms: ${args[0]}`
          })
        }

        return response
      } catch (error) {
        errorCount++
        throw error
      }
    }

    // Store request metrics for access by collectClientMetrics
    ;(window as any).__requestMetrics = {
      getRequestCount: () => requestCount,
      getErrorCount: () => errorCount,
      getAverageResponseTime: () => requestCount > 0 ? totalResponseTime / requestCount : 0
    }
  }

  // Monitor memory leaks
  private monitorMemoryLeaks() {
    if (typeof window === 'undefined' || !('memory' in performance)) return

    let lastMemoryUsage = 0
    let increasingMemoryCount = 0

    setInterval(() => {
      const memory = (performance as any).memory
      const currentMemoryUsage = memory.usedJSHeapSize

      if (currentMemoryUsage > lastMemoryUsage) {
        increasingMemoryCount++
      } else {
        increasingMemoryCount = 0
      }

      // Alert if memory keeps increasing
      if (increasingMemoryCount > 10) { // 10 consecutive increases (5 minutes)
        this.createAlert({
          type: 'performance',
          severity: 'high',
          title: 'Potential Memory Leak',
          description: `Memory usage continuously increasing: ${(currentMemoryUsage / 1024 / 1024).toFixed(2)}MB`
        })
        increasingMemoryCount = 0 // Reset to avoid spam
      }

      lastMemoryUsage = currentMemoryUsage
    }, 30000) // Check every 30 seconds
  }

  // Helper methods for network metrics
  private getRequestCount(): number {
    return (window as any).__requestMetrics?.getRequestCount() || 0
  }

  private getErrorCount(): number {
    return (window as any).__requestMetrics?.getErrorCount() || 0
  }

  private getAverageResponseTime(): number {
    return (window as any).__requestMetrics?.getAverageResponseTime() || 0
  }

  // Add metrics to history
  private addMetrics(metrics: SystemMetrics) {
    this.metrics.push(metrics)
    
    // Keep only recent metrics
    if (this.metrics.length > this.metricsHistory) {
      this.metrics.shift()
    }

    // Emit metrics event (for real-time updates)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('system-metrics', {
        detail: metrics
      }))
    }
  }

  // Create system alert
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp'>) {
    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...alert
    }

    this.alerts.push(newAlert)

    // Keep only recent alerts
    if (this.alerts.length > 50) {
      this.alerts.shift()
    }

    console.warn(`🚨 System Alert [${newAlert.severity.toUpperCase()}]:`, newAlert.title, newAlert.description)

    // Emit alert event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('system-alert', {
        detail: newAlert
      }))
    }

    // Send critical alerts immediately
    if (newAlert.severity === 'critical') {
      this.sendCriticalAlert(newAlert)
    }
  }

  // Send critical alert notifications
  private sendCriticalAlert(alert: Alert) {
    // In production, integrate with alerting systems:
    // - PagerDuty
    // - Slack
    // - Email
    // - SMS
    console.error('🚨 CRITICAL ALERT:', alert)

    // Example: Send to monitoring endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      }).catch(error => console.error('Failed to send critical alert:', error))
    }
  }

  // Public API methods
  startMonitoring() {
    if (!this.isMonitoring) {
      this.isMonitoring = true
      this.initialize()
      console.log('📊 System monitoring started')
    }
  }

  stopMonitoring() {
    if (this.isMonitoring) {
      this.isMonitoring = false
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval)
      }
      console.log('📊 System monitoring stopped')
    }
  }

  getMetrics(count = 10): SystemMetrics[] {
    return this.metrics.slice(-count)
  }

  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  getAlerts(count = 20): Alert[] {
    return this.alerts.slice(-count)
  }

  getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      console.log('✅ Alert resolved:', alert.title)
    }
  }

  clearResolvedAlerts() {
    this.alerts = this.alerts.filter(alert => !alert.resolved)
  }

  // Update thresholds
  updateThresholds(newThresholds: Partial<typeof this.thresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    console.log('🔧 Monitoring thresholds updated:', newThresholds)
  }

  // Get system health summary
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    issues: string[]
  } {
    const currentMetrics = this.getCurrentMetrics()
    const unresolvedAlerts = this.getUnresolvedAlerts()
    
    let score = 100
    let issues: string[] = []
    
    if (!currentMetrics) {
      return { status: 'warning', score: 50, issues: ['No metrics available'] }
    }

    // Check memory
    if (currentMetrics.memory && currentMetrics.memory.percentage > this.thresholds.memory) {
      score -= 20
      issues.push(`High memory usage: ${currentMetrics.memory.percentage.toFixed(1)}%`)
    }

    // Check storage
    if (currentMetrics.storage && currentMetrics.storage.percentage > this.thresholds.diskUsage) {
      score -= 15
      issues.push(`High storage usage: ${currentMetrics.storage.percentage.toFixed(1)}%`)
    }

    // Check alerts
    const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'critical')
    const highAlerts = unresolvedAlerts.filter(a => a.severity === 'high')
    
    score -= criticalAlerts.length * 25
    score -= highAlerts.length * 10
    
    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} critical alert(s)`)
    }
    if (highAlerts.length > 0) {
      issues.push(`${highAlerts.length} high-priority alert(s)`)
    }

    score = Math.max(0, score)
    
    let status: 'healthy' | 'warning' | 'critical'
    if (score >= 80) status = 'healthy'
    else if (score >= 50) status = 'warning'
    else status = 'critical'

    return { status, score, issues }
  }
}

// Export singleton
export const systemMonitor = SystemMonitor.getInstance()

// Convenience functions
export const startMonitoring = () => systemMonitor.startMonitoring()
export const stopMonitoring = () => systemMonitor.stopMonitoring()
export const getSystemMetrics = (count?: number) => systemMonitor.getMetrics(count)
export const getSystemAlerts = (count?: number) => systemMonitor.getAlerts(count)
export const getSystemHealth = () => systemMonitor.getSystemHealth()
export const resolveSystemAlert = (alertId: string) => systemMonitor.resolveAlert(alertId)

// React hook for system monitoring
export function useSystemMonitor() {
  return {
    startMonitoring,
    stopMonitoring,
    getMetrics: getSystemMetrics,
    getAlerts: getSystemAlerts,
    getHealth: getSystemHealth,
    resolveAlert: resolveSystemAlert,
    getCurrentMetrics: () => systemMonitor.getCurrentMetrics(),
    getUnresolvedAlerts: () => systemMonitor.getUnresolvedAlerts()
  }
}