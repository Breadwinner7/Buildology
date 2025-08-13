// Error types for better categorization
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  APPLICATION = 'APPLICATION',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError extends Error {
  type: ErrorType
  code?: string
  statusCode?: number
  userMessage?: string
  context?: Record<string, any>
  timestamp: Date
}

export class CustomError extends Error implements AppError {
  type: ErrorType
  code?: string
  statusCode?: number
  userMessage?: string
  context?: Record<string, any>
  timestamp: Date

  constructor(
    message: string,
    type: ErrorType = ErrorType.APPLICATION,
    options?: {
      code?: string
      statusCode?: number
      userMessage?: string
      context?: Record<string, any>
    }
  ) {
    super(message)
    this.name = 'CustomError'
    this.type = type
    this.code = options?.code
    this.statusCode = options?.statusCode
    this.userMessage = options?.userMessage || message
    this.context = options?.context
    this.timestamp = new Date()
  }
}

// Error reporting service
class ErrorReportingService {
  private static instance: ErrorReportingService
  private errorQueue: AppError[] = []
  private isOnline = typeof window !== 'undefined' ? navigator.onLine : true

  public static getInstance(): ErrorReportingService {
    if (!this.instance) {
      this.instance = new ErrorReportingService()
    }
    return this.instance
  }

  // Capture and report errors
  captureException(error: Error | AppError, context?: Record<string, any>) {
    const appError = this.normalizeError(error, context)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Application Error:', {
        type: appError.type,
        message: appError.message,
        code: appError.code,
        context: appError.context,
        stack: appError.stack
      })
    }

    // Queue error for reporting
    this.errorQueue.push(appError)

    // Send to external service (implement based on your needs)
    this.sendToExternalService(appError)

    return appError
  }

  // Capture user feedback with errors
  captureUserFeedback(error: AppError, feedback: string, userEmail?: string) {
    const enhancedError = {
      ...error,
      context: {
        ...error.context,
        userFeedback: feedback,
        userEmail,
        reportedAt: new Date().toISOString()
      }
    }

    this.sendToExternalService(enhancedError)
  }

  // Performance monitoring
  capturePerformanceMetric(metric: string, value: number, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${metric}`, { value, context })
    }

    // Send to analytics service
    this.sendPerformanceMetric(metric, value, context)
  }

  private normalizeError(error: Error | AppError, context?: Record<string, any>): AppError {
    if (error instanceof CustomError) {
      return {
        ...error,
        context: { ...error.context, ...context }
      }
    }

    // Convert regular errors to AppError
    const errorType = this.categorizeError(error)
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: errorType,
      userMessage: this.getUserFriendlyMessage(errorType, error.message),
      context,
      timestamp: new Date()
    }
  }

  private categorizeError(error: Error): ErrorType {
    const message = error.message.toLowerCase()
    
    if (message.includes('auth') || message.includes('login') || message.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION
    }
    
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return ErrorType.AUTHORIZATION
    }
    
    if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
      return ErrorType.VALIDATION
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK
    }
    
    if (message.includes('database') || message.includes('sql') || message.includes('supabase')) {
      return ErrorType.DATABASE
    }
    
    return ErrorType.APPLICATION
  }

  private getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'Please check your login credentials and try again.'
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to access this resource.'
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.'
      case ErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection.'
      case ErrorType.DATABASE:
        return 'Data service temporarily unavailable. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  private async sendToExternalService(error: AppError) {
    // TODO: Implement integration with error reporting service
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    
    try {
      // For now, just store in local storage for development
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        const errors = JSON.parse(localStorage.getItem('app_errors') || '[]')
        errors.push({
          ...error,
          stack: error.stack?.substring(0, 500) // Truncate stack trace
        })
        
        // Keep only last 100 errors
        if (errors.length > 100) {
          errors.splice(0, errors.length - 100)
        }
        
        localStorage.setItem('app_errors', JSON.stringify(errors))
      }
      
      // In production, send to your error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // })
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private sendPerformanceMetric(metric: string, value: number, context?: Record<string, any>) {
    // TODO: Implement performance tracking
    // Examples: Google Analytics, Mixpanel, custom analytics
  }

  // Get errors for debugging (development only)
  getStoredErrors(): AppError[] {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      return JSON.parse(localStorage.getItem('app_errors') || '[]')
    }
    return []
  }

  // Clear stored errors
  clearStoredErrors() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_errors')
    }
    this.errorQueue = []
  }
}

// Export singleton instance
export const errorReportingService = ErrorReportingService.getInstance()

// Convenience functions
export const captureException = (error: Error, context?: Record<string, any>) => {
  return errorReportingService.captureException(error, context)
}

export const captureUserFeedback = (error: AppError, feedback: string, userEmail?: string) => {
  errorReportingService.captureUserFeedback(error, feedback, userEmail)
}

export const capturePerformanceMetric = (metric: string, value: number, context?: Record<string, any>) => {
  errorReportingService.capturePerformanceMetric(metric, value, context)
}