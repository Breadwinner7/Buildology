'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, FileText } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-muted/30"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
    </div>
  )
}

interface SkeletonProps {
  className?: string
  children?: React.ReactNode
}

export function Skeleton({ className, children }: SkeletonProps) {
  return (
    <div className={cn('skeleton rounded-lg', className)}>
      {children}
    </div>
  )
}

// Pre-built skeleton components for common use cases
export function SkeletonCard() {
  return (
    <div className="card-elevated p-6 space-y-4 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-8 w-16 rounded-xl" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="card-elevated p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[60px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-elevated p-6 space-y-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

interface LoadingStateProps {
  type?: 'card' | 'table' | 'stats' | 'custom'
  count?: number
  children?: React.ReactNode
  className?: string
}

export function LoadingState({ type = 'card', count = 3, children, className }: LoadingStateProps) {
  if (type === 'stats') {
    return <SkeletonStats />
  }

  if (type === 'table') {
    return <SkeletonTable />
  }

  if (type === 'custom' && children) {
    return <div className={cn('animate-fade-in', className)}>{children}</div>
  }

  // Default card loading
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  )
}

// Loading overlay for full-screen loading
interface LoadingOverlayProps {
  title?: string
  description?: string
}

export function LoadingOverlay({ title = 'Loading...', description }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center space-y-4 animate-scale-in">
        <LoadingSpinner size="xl" className="mx-auto" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline loading for buttons and small components
interface InlineLoadingProps {
  size?: 'sm' | 'md'
  text?: string
}

export function InlineLoading({ size = 'sm', text }: InlineLoadingProps) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

// Enhanced skeleton components for specific use cases
export function SkeletonProjectCard() {
  return (
    <div className="card-elevated p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      
      {/* Contact info */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 pt-2 border-t">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <Skeleton className="h-5 w-8 mx-auto" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex -space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-6 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-elevated p-6 space-y-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Chart Area */}
        <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-3">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: '800ms' }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonProjectCard key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: '1200ms' }}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-xl" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonAnalytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated p-6 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Tabs */}
      <div className="space-y-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>
        
        {/* Chart Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card-elevated p-6 animate-fade-in" style={{ animationDelay: `${800 + i * 100}ms` }}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Full Width Chart */}
        <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: '1000ms' }}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Progress indicator for multi-step processes
interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
  className?: string
}

export function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  stepLabels = [], 
  className 
}: ProgressIndicatorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Step {currentStep} of {totalSteps}</span>
        <span className="text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
      </div>
      
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        
        {stepLabels.length > 0 && (
          <div className="flex justify-between mt-2">
            {stepLabels.map((label, index) => (
              <span 
                key={index}
                className={cn(
                  'text-xs',
                  index < currentStep ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Smart loading component that shows different states
interface SmartLoadingProps {
  isLoading: boolean
  hasData: boolean
  error?: string | null
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SmartLoading({
  isLoading,
  hasData,
  error,
  loadingComponent,
  emptyComponent,
  errorComponent,
  children,
  className
}: SmartLoadingProps) {
  if (error) {
    return errorComponent || (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center space-y-4', className)}>
        <div className="p-3 bg-destructive/10 rounded-full">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className={className}>{loadingComponent || <LoadingSpinner className="mx-auto" />}</div>
  }

  if (!hasData) {
    return emptyComponent || (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center space-y-4', className)}>
        <div className="p-3 bg-muted rounded-full">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">No data found</h3>
          <p className="text-sm text-muted-foreground">There's nothing to display yet.</p>
        </div>
      </div>
    )
  }

  return <div className={className}>{children}</div>
}