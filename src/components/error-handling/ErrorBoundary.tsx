'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { captureException, captureUserFeedback, type AppError } from '@/lib/error-handling/error-service'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'section' | 'component'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
  showDetails: boolean
  feedbackSent: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorId: null,
      showDetails: false,
      feedbackSent: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', onError } = this.props
    
    // Capture error with context
    const appError = captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: level,
      errorId: this.state.errorId,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    })

    // Call optional error handler
    if (onError) {
      onError(error, errorInfo)
    }

    console.error('Error Boundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorId: null,
      showDetails: false,
      feedbackSent: false
    })
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleToggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  handleSendFeedback = async () => {
    const { error, errorId } = this.state
    
    if (!error || !errorId) return

    try {
      // In a real implementation, you'd show a feedback form
      // For now, we'll just simulate sending feedback
      const feedback = "User encountered an error and clicked send feedback"
      
      captureUserFeedback(error as AppError, feedback)
      this.setState({ feedbackSent: true })
    } catch (err) {
      console.error('Failed to send feedback:', err)
    }
  }

  render() {
    const { hasError, error, errorId, showDetails, feedbackSent } = this.state
    const { children, fallback, level = 'component' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Different error UIs based on level
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Something went wrong</CardTitle>
                <CardDescription>
                  We encountered an unexpected error. Our team has been notified.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errorId && (
                  <div className="text-sm text-gray-500 text-center">
                    Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
                  </div>
                )}
                
                {showDetails && error && (
                  <div className="bg-gray-50 p-3 rounded border text-xs">
                    <strong>Error Details:</strong>
                    <pre className="mt-2 whitespace-pre-wrap break-words">
                      {error.message}
                    </pre>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <Button 
                    onClick={this.handleRetry} 
                    variant="default" 
                    className="flex-1"
                    size="sm"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={this.handleGoHome} 
                    variant="outline" 
                    className="flex-1"
                    size="sm"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </div>
                <div className="flex gap-2 w-full">
                  <Button 
                    onClick={this.handleToggleDetails} 
                    variant="ghost" 
                    size="sm"
                    className="flex-1"
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  <Button 
                    onClick={this.handleSendFeedback} 
                    variant="ghost" 
                    size="sm"
                    className="flex-1"
                    disabled={feedbackSent}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {feedbackSent ? 'Sent!' : 'Report Issue'}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )
      }

      // Section-level error UI
      if (level === 'section') {
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-orange-600" />
                Section Error
              </CardTitle>
              <CardDescription>
                This section encountered an error and couldn't load properly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorId && (
                <div className="text-sm text-gray-500 mb-3">
                  Error ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{errorId}</code>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={this.handleRetry} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Section
              </Button>
            </CardFooter>
          </Card>
        )
      }

      // Component-level error UI (minimal)
      return (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-sm text-red-800">Component failed to load</span>
            <Button 
              onClick={this.handleRetry} 
              size="sm" 
              variant="ghost" 
              className="ml-auto h-6 text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return children
  }
}

// Convenience wrapper for page-level errors
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">{children}</ErrorBoundary>
)

// Convenience wrapper for section-level errors
export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section">{children}</ErrorBoundary>
)

// Convenience wrapper for component-level errors
export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">{children}</ErrorBoundary>
)

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  level: 'page' | 'section' | 'component' = 'component'
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary level={level}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}