// Comprehensive logging infrastructure for production insurance platform
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: Record<string, any>
  userId?: string
  sessionId?: string
  traceId?: string
  component?: string
  action?: string
  duration?: number
  error?: Error
}

export interface LogTransport {
  name: string
  log(entry: LogEntry): Promise<void> | void
}

// Console transport for development
class ConsoleTransport implements LogTransport {
  name = 'console'

  log(entry: LogEntry): void {
    const emoji = this.getEmoji(entry.level)
    const timestamp = entry.timestamp.toISOString()
    const context = entry.context ? JSON.stringify(entry.context, null, 2) : ''
    
    const logMessage = [
      `${emoji} [${entry.level.toUpperCase()}] ${timestamp}`,
      entry.component && `[${entry.component}]`,
      entry.action && `{${entry.action}}`,
      entry.message,
      entry.duration && `(${entry.duration}ms)`,
      entry.error && `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`,
      context && `\nContext: ${context}`
    ].filter(Boolean).join(' ')

    switch (entry.level) {
      case 'critical':
      case 'error':
        console.error(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      case 'debug':
        console.debug(logMessage)
        break
      default:
        console.log(logMessage)
    }
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'critical': return '🚨'
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      case 'debug': return '🔍'
      default: return '📝'
    }
  }
}

// File transport for production logging
class FileTransport implements LogTransport {
  name = 'file'
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout
  private maxBufferSize = 100

  constructor() {
    // Flush buffer every 10 seconds
    this.flushInterval = setInterval(() => this.flush(), 10000)
  }

  async log(entry: LogEntry): Promise<void> {
    this.buffer.push(entry)
    
    // Flush immediately for critical errors
    if (entry.level === 'critical' || this.buffer.length >= this.maxBufferSize) {
      await this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    try {
      const logs = [...this.buffer]
      this.buffer = []

      // In production, write to file system or external logging service
      if (typeof window === 'undefined') {
        // Server-side: could write to file or send to logging service
        console.log(`📁 Would write ${logs.length} log entries to file`)
      } else {
        // Client-side: store in localStorage for development
        const existingLogs = JSON.parse(localStorage.getItem('app_logs') || '[]')
        const allLogs = [...existingLogs, ...logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        }))]
        
        // Keep only last 1000 logs
        if (allLogs.length > 1000) {
          allLogs.splice(0, allLogs.length - 1000)
        }
        
        localStorage.setItem('app_logs', JSON.stringify(allLogs))
      }
    } catch (error) {
      console.error('Failed to flush logs:', error)
    }
  }

  destroy(): void {
    clearInterval(this.flushInterval)
    this.flush()
  }
}

// Remote transport for production logging services
class RemoteTransport implements LogTransport {
  name = 'remote'
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout
  private endpoint: string

  constructor(endpoint = '/api/logs') {
    this.endpoint = endpoint
    this.flushInterval = setInterval(() => this.flush(), 30000) // Flush every 30 seconds
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry)
    
    // Immediate flush for critical errors
    if (entry.level === 'critical') {
      this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || typeof window === 'undefined') return

    try {
      const logs = [...this.buffer]
      this.buffer = []

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logs.map(log => ({
            ...log,
            timestamp: log.timestamp.toISOString(),
            error: log.error ? {
              name: log.error.name,
              message: log.error.message,
              stack: log.error.stack
            } : undefined
          }))
        })
      })
    } catch (error) {
      console.error('Failed to send logs to remote:', error)
      // Put logs back in buffer to retry
      this.buffer.unshift(...logs)
    }
  }

  destroy(): void {
    clearInterval(this.flushInterval)
    this.flush()
  }
}

// Main logger class
class Logger {
  private static instance: Logger
  private transports: LogTransport[] = []
  private sessionId: string
  private userId?: string
  private defaultContext: Record<string, any> = {}

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeDefaultTransports()
  }

  public static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger()
    }
    return this.instance
  }

  private initializeDefaultTransports() {
    // Always add console transport
    this.addTransport(new ConsoleTransport())
    
    // Add file transport in development/production
    this.addTransport(new FileTransport())
    
    // Add remote transport in production
    if (process.env.NODE_ENV === 'production') {
      this.addTransport(new RemoteTransport())
    }
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport)
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name)
  }

  setUserId(userId: string): void {
    this.userId = userId
  }

  setDefaultContext(context: Record<string, any>): void {
    this.defaultContext = { ...this.defaultContext, ...context }
  }

  clearUserId(): void {
    this.userId = undefined
    this.sessionId = this.generateSessionId()
  }

  // Core logging methods
  private async log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      userId: this.userId,
      sessionId: this.sessionId,
      traceId: this.generateTraceId(),
      error
    }

    // Log to all transports
    await Promise.all(
      this.transports.map(transport => 
        Promise.resolve(transport.log(entry)).catch(err => 
          console.error(`Transport ${transport.name} failed:`, err)
        )
      )
    )
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context)
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, context, error)
  }

  critical(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('critical', message, context, error)
  }

  // Convenience methods for common patterns
  logApiCall(method: string, url: string, duration: number, status: number, context?: Record<string, any>): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info'
    this.log(level, `API ${method} ${url}`, {
      ...context,
      method,
      url,
      duration,
      status,
      component: 'api'
    })
  }

  logUserAction(action: string, context?: Record<string, any>): void {
    this.log('info', `User action: ${action}`, {
      ...context,
      component: 'user-action'
    })
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>): void {
    const level = severity === 'critical' ? 'critical' : severity === 'high' ? 'error' : 'warn'
    this.log(level, `Security event: ${event}`, {
      ...context,
      component: 'security',
      severity
    })
  }

  logPerformance(operation: string, duration: number, context?: Record<string, any>): void {
    const level = duration > 5000 ? 'warn' : 'info'
    this.log(level, `Performance: ${operation}`, {
      ...context,
      duration,
      component: 'performance'
    })
  }

  logBusinessEvent(event: string, context?: Record<string, any>): void {
    this.log('info', `Business event: ${event}`, {
      ...context,
      component: 'business'
    })
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Performance timing wrapper
  async time<T>(operation: string, fn: () => Promise<T>, context?: Record<string, any>): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.logPerformance(operation, duration, context)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.error(`Failed operation: ${operation}`, error as Error, { ...context, duration })
      throw error
    }
  }

  // Get logs for debugging (development only)
  getLogs(): LogEntry[] {
    if (typeof window === 'undefined') return []
    
    try {
      const logs = localStorage.getItem('app_logs')
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  // Clear logs
  clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs')
    }
  }

  // Cleanup
  destroy(): void {
    this.transports.forEach(transport => {
      if ('destroy' in transport && typeof transport.destroy === 'function') {
        (transport as any).destroy()
      }
    })
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Convenience exports
export const logDebug = (message: string, context?: Record<string, any>) => logger.debug(message, context)
export const logInfo = (message: string, context?: Record<string, any>) => logger.info(message, context)
export const logWarn = (message: string, context?: Record<string, any>) => logger.warn(message, context)
export const logError = (message: string, error?: Error, context?: Record<string, any>) => logger.error(message, error, context)
export const logCritical = (message: string, error?: Error, context?: Record<string, any>) => logger.critical(message, error, context)

// React hook for logging
export function useLogger() {
  return {
    debug: logDebug,
    info: logInfo,
    warn: logWarn,
    error: logError,
    critical: logCritical,
    logUserAction: (action: string, context?: Record<string, any>) => logger.logUserAction(action, context),
    logPerformance: (operation: string, duration: number, context?: Record<string, any>) => logger.logPerformance(operation, duration, context),
    time: <T>(operation: string, fn: () => Promise<T>, context?: Record<string, any>) => logger.time(operation, fn, context)
  }
}