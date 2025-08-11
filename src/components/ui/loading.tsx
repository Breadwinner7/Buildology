'use client'

import { cn } from '@/lib/utils'

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