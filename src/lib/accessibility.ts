/**
 * Comprehensive accessibility utilities
 * WCAG 2.1 compliant helpers and hooks
 */

import React from 'react'

// ARIA live region types
export type AriaLiveType = 'polite' | 'assertive' | 'off'

// Common ARIA roles
export const AriaRoles = {
  button: 'button',
  link: 'link',
  menuitem: 'menuitem',
  tab: 'tab',
  tabpanel: 'tabpanel',
  dialog: 'dialog',
  alertdialog: 'alertdialog',
  banner: 'banner',
  navigation: 'navigation',
  main: 'main',
  contentinfo: 'contentinfo',
  complementary: 'complementary',
  region: 'region',
  search: 'search',
  form: 'form',
  article: 'article',
  section: 'section',
  list: 'list',
  listitem: 'listitem',
  grid: 'grid',
  gridcell: 'gridcell',
  row: 'row',
  columnheader: 'columnheader',
  rowheader: 'rowheader'
} as const

// Color contrast utilities
export const ContrastUtils = {
  // Calculate relative luminance (WCAG formula)
  getLuminance: (hex: string): number => {
    const rgb = ContrastUtils.hexToRgb(hex)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  },

  // Convert hex to RGB
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  },

  // Calculate contrast ratio between two colors
  getContrastRatio: (color1: string, color2: string): number => {
    const lum1 = ContrastUtils.getLuminance(color1)
    const lum2 = ContrastUtils.getLuminance(color2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)
  },

  // Check if contrast meets WCAG standards
  meetsWCAG: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = ContrastUtils.getContrastRatio(color1, color2)
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7
  },

  // Get accessible text color for background
  getAccessibleTextColor: (backgroundColor: string): string => {
    const whiteContrast = ContrastUtils.getContrastRatio(backgroundColor, '#ffffff')
    const blackContrast = ContrastUtils.getContrastRatio(backgroundColor, '#000000')
    return whiteContrast > blackContrast ? '#ffffff' : '#000000'
  }
}

// Keyboard navigation utilities
export const KeyboardUtils = {
  // Common key codes
  keys: {
    Enter: 'Enter',
    Space: ' ',
    Escape: 'Escape',
    Tab: 'Tab',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown'
  },

  // Create keyboard event handler
  createKeyHandler: (handlers: Record<string, (event: KeyboardEvent) => void>) => {
    return (event: KeyboardEvent) => {
      const handler = handlers[event.key]
      if (handler) {
        event.preventDefault()
        handler(event)
      }
    }
  },

  // Focus management utilities
  focusUtils: {
    getFocusableElements: (container: HTMLElement): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ')

      return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
    },

    trapFocus: (container: HTMLElement) => {
      const focusableElements = KeyboardUtils.focusUtils.getFocusableElements(container)
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus()
              event.preventDefault()
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus()
              event.preventDefault()
            }
          }
        }
      }

      container.addEventListener('keydown', handleKeyDown)
      firstElement?.focus()

      return () => {
        container.removeEventListener('keydown', handleKeyDown)
      }
    }
  }
}

// Screen reader utilities
export const ScreenReaderUtils = {
  // Announce message to screen readers
  announce: (message: string, priority: AriaLiveType = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.style.width = '1px'
    announcement.style.height = '1px'
    announcement.style.overflow = 'hidden'
    
    document.body.appendChild(announcement)
    announcement.textContent = message
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },

  // Generate accessible description for complex UI elements
  generateDescription: (element: {
    type: string
    status?: string
    count?: number
    position?: { current: number; total: number }
    additional?: string[]
  }): string => {
    const parts = [element.type]
    
    if (element.status) {
      parts.push(element.status)
    }
    
    if (element.count !== undefined) {
      parts.push(`${element.count} items`)
    }
    
    if (element.position) {
      parts.push(`${element.position.current} of ${element.position.total}`)
    }
    
    if (element.additional) {
      parts.push(...element.additional)
    }
    
    return parts.join(', ')
  }
}

// React hooks for accessibility
export function useAnnounce() {
  const announce = React.useCallback((message: string, priority: AriaLiveType = 'polite') => {
    ScreenReaderUtils.announce(message, priority)
  }, [])

  return announce
}

export function useKeyboardNavigation(handlers: Record<string, () => void>) {
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    const handler = handlers[event.key]
    if (handler) {
      event.preventDefault()
      handler()
    }
  }, [handlers])

  return { onKeyDown: handleKeyDown }
}

export function useFocusTrap(isActive: boolean = true) {
  const containerRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const cleanup = KeyboardUtils.focusUtils.trapFocus(containerRef.current)
    return cleanup
  }, [isActive])

  return containerRef
}

export function useAriaLiveRegion(initialMessage = '') {
  const [message, setMessage] = React.useState(initialMessage)
  const regionRef = React.useRef<HTMLDivElement>(null)

  const announce = React.useCallback((text: string, priority: AriaLiveType = 'polite') => {
    if (regionRef.current) {
      regionRef.current.setAttribute('aria-live', priority)
      setMessage(text)
      
      // Clear message after announcement
      setTimeout(() => setMessage(''), 100)
    }
  }, [])

  const LiveRegion = React.useCallback(() => (
    React.createElement('div', {
      ref: regionRef,
      'aria-live': 'polite',
      'aria-atomic': 'true',
      className: 'sr-only'
    }, message)
  ), [message])

  return { announce, LiveRegion }
}

// HOC for adding accessibility features
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    role?: string
    label?: string
    describedBy?: string
  } = {}
) {
  return React.forwardRef<any, P & { 'aria-label'?: string; 'aria-describedby'?: string }>((props, ref) => {
    const accessibilityProps = {
      role: options.role,
      'aria-label': props['aria-label'] || options.label,
      'aria-describedby': props['aria-describedby'] || options.describedBy,
      ...props
    }

    return React.createElement(Component, { ...accessibilityProps, ref })
  })
}

// Skip navigation link component  
export const SkipNavigation = ({ targetId = 'main-content' }: { targetId?: string }) => 
  React.createElement('a', {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:border focus:rounded'
  }, 'Skip to main content')

// Utility functions for creating accessible elements
export const createAccessibleElement = {
  button: (props: any, children: React.ReactNode) => 
    React.createElement('button', {
      type: 'button',
      'aria-pressed': props.pressed ? 'true' : 'false',
      ...props
    }, children),

  link: (props: any, children: React.ReactNode) =>
    React.createElement('a', {
      role: 'link',
      tabIndex: 0,
      ...props
    }, children),

  heading: (level: 1 | 2 | 3 | 4 | 5 | 6, props: any, children: React.ReactNode) =>
    React.createElement(`h${level}`, {
      role: 'heading',
      'aria-level': level,
      ...props
    }, children),

  list: (props: any, children: React.ReactNode) =>
    React.createElement('ul', {
      role: 'list',
      ...props
    }, children),

  listItem: (props: any, children: React.ReactNode) =>
    React.createElement('li', {
      role: 'listitem',
      ...props
    }, children)
}

// Accessibility validation utilities
export const validateAccessibility = {
  // Check if element has accessible name
  hasAccessibleName: (element: HTMLElement): boolean => {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      (element as HTMLInputElement).labels?.length
    )
  },

  // Check if interactive element is focusable
  isFocusable: (element: HTMLElement): boolean => {
    const tabIndex = element.getAttribute('tabindex')
    return tabIndex !== '-1' && !element.hasAttribute('disabled')
  },

  // Check form field accessibility
  isFormFieldAccessible: (field: HTMLElement): boolean => {
    const hasLabel = !!(
      field.getAttribute('aria-label') ||
      field.getAttribute('aria-labelledby') ||
      (field as HTMLInputElement).labels?.length
    )
    
    const hasDescription = !!(
      field.getAttribute('aria-describedby')
    )
    
    return hasLabel
  }
}