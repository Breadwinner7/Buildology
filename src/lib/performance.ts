import React from 'react'

/**
 * Performance utilities for React optimization
 */

// Memoization with deep comparison for complex objects
export function useDeepMemo<T>(value: T, deps: React.DependencyList): T {
  const ref = React.useRef<T>(value)
  const depsRef = React.useRef<React.DependencyList>(deps)

  if (!areEqual(deps, depsRef.current)) {
    ref.current = value
    depsRef.current = deps
  }

  return ref.current
}

// Deep equality check for objects and arrays
function areEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => areEqual(item, b[index]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => areEqual(a[key], b[key]))
  }
  return false
}

// Debounced value hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttled callback hook
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRan = React.useRef(Date.now())

  return React.useCallback(
    ((...args) => {
      if (Date.now() - lastRan.current >= delay) {
        callback(...args)
        lastRan.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

// Optimized intersection observer hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const [hasIntersected, setHasIntersected] = React.useState(false)

  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasIntersected, options])

  return { isIntersecting, hasIntersected }
}

// Virtual scrolling hook for large lists
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = React.useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = React.useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  )

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Performance monitoring hook
export function usePerformance(componentName: string) {
  const renderCount = React.useRef(0)
  const startTime = React.useRef(Date.now())

  renderCount.current++

  React.useEffect(() => {
    const endTime = Date.now()
    const renderTime = endTime - startTime.current
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${componentName} Performance:`, {
        renders: renderCount.current,
        lastRenderTime: `${renderTime}ms`
      })
    }
    
    startTime.current = endTime
  })

  return { renderCount: renderCount.current }
}

// Memory-efficient state hook for large datasets
export function useLazyState<T>(
  initialState: T | (() => T),
  shouldUpdate: (prev: T, next: T) => boolean = (prev, next) => prev !== next
) {
  const [state, setState] = React.useState(initialState)
  const prevState = React.useRef(state)

  const setLazyState = React.useCallback(
    (nextState: T | ((prev: T) => T)) => {
      setState(prev => {
        const next = typeof nextState === 'function' 
          ? (nextState as (prev: T) => T)(prev) 
          : nextState

        if (shouldUpdate(prev, next)) {
          prevState.current = next
          return next
        }
        return prev
      })
    },
    [shouldUpdate]
  )

  return [state, setLazyState] as const
}

// Image lazy loading hook with performance optimization
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '')
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [isError, setIsError] = React.useState(false)
  const imageRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const img = new Image()
    
    img.onload = () => {
      setImageSrc(src)
      setIsLoaded(true)
      setIsError(false)
    }
    
    img.onerror = () => {
      setIsError(true)
      setIsLoaded(false)
    }

    img.src = src
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return { imageSrc, isLoaded, isError, imageRef }
}

// Bundle size optimization - dynamic import helper
export function lazy<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ComponentType = () => React.createElement('div', {}, 'Loading...')
) {
  const LazyComponent = React.lazy(importFunc)
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => 
    React.createElement(React.Suspense, { fallback: React.createElement(fallback) },
      React.createElement(LazyComponent, { ...props, ref })
    )
  )
}

// Memory cleanup hook
export function useCleanup(cleanup: () => void, deps: React.DependencyList = []) {
  React.useEffect(() => {
    return cleanup
  }, deps)
}

// Optimized event listener hook
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: Element | null,
  options?: AddEventListenerOptions
) {
  const savedHandler = React.useRef(handler)

  React.useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  React.useEffect(() => {
    const targetElement = element || window
    if (!targetElement?.addEventListener) return

    const eventListener: typeof handler = (event) => savedHandler.current(event)
    
    targetElement.addEventListener(eventName, eventListener as EventListener, options)
    
    return () => {
      targetElement.removeEventListener(eventName, eventListener as EventListener, options)
    }
  }, [eventName, element, options])
}