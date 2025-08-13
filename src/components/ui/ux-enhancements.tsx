'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, X, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { Button } from './button'

// Toast notification system enhancement
interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
  onClose?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export function CustomToast({
  type = 'info',
  title,
  description,
  duration = 5000,
  onClose,
  action
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true)
        setTimeout(() => {
          setIsVisible(false)
          onClose?.()
        }, 300)
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])
  
  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }
  
  if (!isVisible) return null
  
  const typeStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  }
  
  const style = typeStyles[type]
  const Icon = style.icon
  
  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 w-96 max-w-sm p-4 rounded-lg shadow-lg border backdrop-blur-sm',
      style.bg,
      style.border,
      'transition-all duration-300 ease-in-out',
      isLeaving ? 'opacity-0 scale-95 translate-x-full' : 'opacity-100 scale-100 translate-x-0'
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', style.iconColor)} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          {action && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={action.onClick}
                className="h-8 px-3 text-xs"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-background/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Smooth scroll to top button
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }
    
    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
  
  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-8 right-8 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      )}
      aria-label="Scroll to top"
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 10l7-7m0 0l7 7m-7-7v18" 
        />
      </svg>
    </button>
  )
}

// Enhanced form field with validation feedback
interface EnhancedFieldProps {
  label: string
  error?: string
  success?: boolean
  loading?: boolean
  children: React.ReactNode
  required?: boolean
  hint?: string
  className?: string
}

export function EnhancedField({
  label,
  error,
  success,
  loading,
  children,
  required,
  hint,
  className
}: EnhancedFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      <div className="relative">
        {children}
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {success && !loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        )}
      </div>
      
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// Smooth page transitions
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div className={cn(
      'transition-all duration-500 ease-out',
      isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
      className
    )}>
      {children}
    </div>
  )
}

// Floating action button
interface FABProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  className
}: FABProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  }
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed z-40 p-4 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl group',
        positionClasses[position],
        className
      )}
      aria-label={label}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className={cn(
          'whitespace-nowrap font-medium transition-all duration-300 overflow-hidden',
          isHovered ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0'
        )}>
          {label}
        </span>
      </div>
    </button>
  )
}

// Context menu component
interface ContextMenuProps {
  children: React.ReactNode
  items: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    disabled?: boolean
    destructive?: boolean
  }[]
  className?: string
}

export function ContextMenu({ children, items, className }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
    setIsOpen(true)
  }
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    const handleScroll = () => {
      setIsOpen(false)
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen])
  
  return (
    <>
      <div onContextMenu={handleContextMenu} className={className}>
        {children}
      </div>
      
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-2 min-w-48 animate-in fade-in-0 zoom-in-95"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, 0)'
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick()
                  setIsOpen(false)
                }
              }}
              disabled={item.disabled}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors',
                item.disabled && 'opacity-50 cursor-not-allowed',
                item.destructive && 'text-destructive hover:bg-destructive/10'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// Breadcrumb navigation with animations
interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  current?: boolean
}

interface AnimatedBreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

export function AnimatedBreadcrumb({ items, separator = '/', className }: AnimatedBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1 text-sm', className)}>
      {items.map((item, index) => (
        <div 
          key={index} 
          className="flex items-center animate-slide-in" 
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {index > 0 && (
            <span className="mx-2 text-muted-foreground/60">{separator}</span>
          )}
          {item.current ? (
            <span className="font-medium text-foreground px-2 py-1 rounded-lg bg-primary/10 text-primary">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick || (() => item.href && (window.location.href = item.href))}
              className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/50"
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  )
}

// Data table with enhanced UX
interface DataTableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading,
  emptyMessage = 'No data found',
  onRowClick,
  className
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
            {columns.map((_, j) => (
              <div key={j} className="h-4 bg-muted rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="p-3 bg-muted rounded-full">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden border rounded-lg', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors hover:bg-muted/50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}