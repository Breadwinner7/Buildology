'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// Hook to detect screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 640) {
        setScreenSize('mobile')
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])
  
  return screenSize
}

// Hook for mobile detection
export function useIsMobile() {
  const screenSize = useScreenSize()
  return screenSize === 'mobile'
}

// Responsive container component
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  mobileClassName?: string
  tabletClassName?: string
  desktopClassName?: string
}

export function ResponsiveContainer({
  children,
  className,
  mobileClassName,
  tabletClassName,
  desktopClassName
}: ResponsiveContainerProps) {
  const screenSize = useScreenSize()
  
  const responsiveClass = cn(
    className,
    screenSize === 'mobile' && mobileClassName,
    screenSize === 'tablet' && tabletClassName,
    screenSize === 'desktop' && desktopClassName
  )
  
  return (
    <div className={responsiveClass}>
      {children}
    </div>
  )
}

// Mobile-optimized grid component
interface MobileGridProps {
  children: React.ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
  className?: string
}

export function MobileGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 'gap-4', tablet: 'gap-6', desktop: 'gap-6' },
  className
}: MobileGridProps) {
  const screenSize = useScreenSize()
  
  const gridClass = cn(
    'grid',
    screenSize === 'mobile' && `grid-cols-${cols.mobile} ${gap.mobile}`,
    screenSize === 'tablet' && `grid-cols-${cols.tablet} ${gap.tablet}`,
    screenSize === 'desktop' && `grid-cols-${cols.desktop} ${gap.desktop}`,
    className
  )
  
  return (
    <div className={gridClass}>
      {children}
    </div>
  )
}

// Mobile-optimized text component
interface ResponsiveTextProps {
  children: React.ReactNode
  size?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
  className?: string
}

export function ResponsiveText({
  children,
  size = { mobile: 'text-sm', tablet: 'text-base', desktop: 'text-base' },
  className
}: ResponsiveTextProps) {
  const screenSize = useScreenSize()
  
  const textClass = cn(
    screenSize === 'mobile' && size.mobile,
    screenSize === 'tablet' && size.tablet,
    screenSize === 'desktop' && size.desktop,
    className
  )
  
  return (
    <span className={textClass}>
      {children}
    </span>
  )
}

// Touch-friendly button wrapper
interface TouchButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function TouchButton({
  children,
  onClick,
  className,
  disabled = false
}: TouchButtonProps) {
  const isMobile = useIsMobile()
  
  const buttonClass = cn(
    'touch-target',
    isMobile && 'min-h-[44px] min-w-[44px] p-3',
    !isMobile && 'p-2',
    'transition-all duration-200',
    disabled && 'opacity-50 pointer-events-none',
    className
  )
  
  return (
    <button 
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  )
}

// Mobile-optimized modal
interface MobileModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  className?: string
}

export function MobileModal({
  children,
  isOpen,
  onClose,
  title,
  className
}: MobileModalProps) {
  const isMobile = useIsMobile()
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className={cn(
        'fixed bg-background',
        isMobile 
          ? 'inset-x-4 inset-y-8 rounded-xl mobile-modal' 
          : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-lg',
        className
      )}>
        {title && (
          <div className="border-b p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <TouchButton onClick={onClose} className="hover:bg-muted rounded-full">
                ×
              </TouchButton>
            </div>
          </div>
        )}
        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// Viewport height utility for mobile
export function useViewportHeight() {
  const [vh, setVh] = useState(0)
  
  useEffect(() => {
    const updateVh = () => {
      setVh(window.innerHeight * 0.01)
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    updateVh()
    window.addEventListener('resize', updateVh)
    window.addEventListener('orientationchange', updateVh)
    
    return () => {
      window.removeEventListener('resize', updateVh)
      window.removeEventListener('orientationchange', updateVh)
    }
  }, [vh])
  
  return vh
}