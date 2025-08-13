import { toast } from 'sonner'
import { ZodError } from 'zod'

export type ApiError = {
  message: string
  code?: string
  field?: string
  details?: any
}

export type ErrorResponse = {
  error: boolean
  message: string
  details?: any
  code?: string
}

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR', 
  AUTH = 'AUTH_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Common error messages
export const ErrorMessages = {
  NETWORK: 'Network error. Please check your connection and try again.',
  AUTH: 'Authentication failed. Please log in again.',
  PERMISSION: 'You don\'t have permission to perform this action.',
  SERVER: 'Server error. Please try again later.',
  VALIDATION: 'Please check your input and try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'This action conflicts with existing data.'
} as const

// Error classification
export function classifyError(error: any): ErrorType {
  if (error instanceof ZodError) {
    return ErrorType.VALIDATION
  }
  
  if (error?.code === 'PGRST301' || error?.code === 'PGRST116') {
    return ErrorType.DATABASE
  }
  
  if (error?.code === 'auth_error' || error?.status === 401) {
    return ErrorType.AUTH
  }
  
  if (error?.status === 403) {
    return ErrorType.PERMISSION
  }
  
  if (error?.status >= 500) {
    return ErrorType.SERVER
  }
  
  if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return ErrorType.NETWORK
  }
  
  return ErrorType.UNKNOWN
}

// Format Zod validation errors
export function formatZodError(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    fieldErrors[path] = err.message
  })
  
  return fieldErrors
}

// Format Supabase errors
export function formatSupabaseError(error: any): ApiError {
  const message = error?.message || 'Database operation failed'
  const code = error?.code || 'DATABASE_ERROR'
  
  // Handle specific Supabase error codes
  switch (error?.code) {
    case 'PGRST116':
      return {
        message: 'The requested resource was not found',
        code: 'NOT_FOUND'
      }
    case 'PGRST301':
      return {
        message: 'You don\'t have permission to access this resource', 
        code: 'PERMISSION_DENIED'
      }
    case '23505':
      return {
        message: 'This record already exists',
        code: 'DUPLICATE_ENTRY'
      }
    case '23503':
      return {
        message: 'This action would violate data integrity constraints',
        code: 'FOREIGN_KEY_VIOLATION'
      }
    case '42P01':
      return {
        message: 'Database table not found',
        code: 'TABLE_NOT_FOUND'
      }
    default:
      return {
        message,
        code
      }
  }
}

// Generic error handler
export function handleError(error: any, context?: string): ApiError {
  console.error(`Error in ${context || 'unknown context'}:`, error)
  
  const errorType = classifyError(error)
  
  switch (errorType) {
    case ErrorType.VALIDATION:
      return {
        message: ErrorMessages.VALIDATION,
        code: ErrorType.VALIDATION,
        details: error instanceof ZodError ? formatZodError(error) : error
      }
    
    case ErrorType.DATABASE:
      return formatSupabaseError(error)
    
    case ErrorType.AUTH:
      return {
        message: ErrorMessages.AUTH,
        code: ErrorType.AUTH
      }
    
    case ErrorType.PERMISSION:
      return {
        message: ErrorMessages.PERMISSION,
        code: ErrorType.PERMISSION
      }
    
    case ErrorType.NETWORK:
      return {
        message: ErrorMessages.NETWORK,
        code: ErrorType.NETWORK
      }
    
    case ErrorType.SERVER:
      return {
        message: ErrorMessages.SERVER,
        code: ErrorType.SERVER
      }
    
    default:
      return {
        message: error?.message || ErrorMessages.UNKNOWN,
        code: ErrorType.UNKNOWN
      }
  }
}

// Toast notification helpers
export const showErrorToast = (error: ApiError | string, title?: string) => {
  const message = typeof error === 'string' ? error : error.message
  toast.error(title || 'Error', {
    description: message,
    duration: 5000,
  })
}

export const showSuccessToast = (message: string, title?: string) => {
  toast.success(title || 'Success', {
    description: message,
    duration: 3000,
  })
}

export const showWarningToast = (message: string, title?: string) => {
  toast.warning(title || 'Warning', {
    description: message,
    duration: 4000,
  })
}

export const showInfoToast = (message: string, title?: string) => {
  toast.info(title || 'Info', {
    description: message,
    duration: 3000,
  })
}

// Error boundary error handler
export function logErrorToBoundary(error: Error, errorInfo?: any) {
  console.error('Error caught by boundary:', error)
  console.error('Error info:', errorInfo)
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service like Sentry, LogRocket, etc.
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }
}

// Network error recovery
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }
  
  throw lastError
}

// Form validation helper
export function validateFormData<T>(
  schema: any,
  data: any,
  onError?: (errors: Record<string, string>) => void
): { isValid: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validatedData = schema.parse(data)
    return { isValid: true, data: validatedData }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = formatZodError(error)
      onError?.(errors)
      return { isValid: false, errors }
    }
    
    const apiError = handleError(error, 'form validation')
    onError?.({ general: apiError.message })
    return { isValid: false, errors: { general: apiError.message } }
  }
}

// API response wrapper
export function wrapApiResponse<T>(data: T, message?: string): { data: T; message?: string; error: false } {
  return {
    data,
    message,
    error: false
  }
}

export function wrapApiError(error: any, context?: string): ErrorResponse {
  const apiError = handleError(error, context)
  return {
    error: true,
    message: apiError.message,
    details: apiError.details,
    code: apiError.code
  }
}