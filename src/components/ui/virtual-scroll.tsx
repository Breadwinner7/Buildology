'use client'

import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { useVirtualScrolling, useThrottle } from '@/lib/performance/optimization-utils'
import { cn } from '@/lib/utils'

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
}

const VirtualScroll = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  className,
  overscan = 5,
  onScroll,
}: VirtualScrollProps<T>) => {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  
  // Throttle scroll updates for performance
  const throttledScrollTop = useThrottle(scrollTop, 16) // 60fps

  // Calculate visible range with overscan
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const visibleStartIndex = Math.floor(throttledScrollTop / itemHeight)
    const visibleEndIndex = Math.min(
      visibleStartIndex + Math.ceil(containerHeight / itemHeight),
      items.length
    )

    const startIdx = Math.max(0, visibleStartIndex - overscan)
    const endIdx = Math.min(items.length, visibleEndIndex + overscan)

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      totalHeight: items.length * itemHeight,
      offsetY: startIdx * itemHeight,
    }
  }, [throttledScrollTop, itemHeight, containerHeight, items.length, overscan])

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, virtualIndex) => {
            const actualIndex = startIndex + virtualIndex
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{
                  height: itemHeight,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Memoized virtual scroll for better performance
const MemoizedVirtualScroll = memo(VirtualScroll) as typeof VirtualScroll

// Virtual table component for structured data
interface VirtualTableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    header: string
    width?: string
    render?: (value: any, row: T, index: number) => React.ReactNode
  }>
  rowHeight: number
  containerHeight: number
  className?: string
  headerClassName?: string
  rowClassName?: string | ((row: T, index: number) => string)
  onRowClick?: (row: T, index: number) => void
}

export const VirtualTable = <T extends Record<string, any>>({
  data,
  columns,
  rowHeight,
  containerHeight,
  className,
  headerClassName,
  rowClassName,
  onRowClick,
}: VirtualTableProps<T>) => {
  const renderRow = useCallback((row: T, index: number) => {
    const rowClasses = typeof rowClassName === 'function' 
      ? rowClassName(row, index)
      : rowClassName

    return (
      <div
        className={cn(
          'flex items-center border-b border-border px-4 hover:bg-muted/50 cursor-pointer',
          rowClasses
        )}
        onClick={() => onRowClick?.(row, index)}
        style={{ height: rowHeight }}
      >
        {columns.map((column, colIndex) => {
          const value = row[column.key]
          const cellContent = column.render 
            ? column.render(value, row, index)
            : String(value || '')

          return (
            <div
              key={String(column.key)}
              className="flex-1 truncate text-sm"
              style={{ 
                width: column.width || 'auto',
                minWidth: column.width || '100px'
              }}
            >
              {cellContent}
            </div>
          )
        })}
      </div>
    )
  }, [columns, rowHeight, rowClassName, onRowClick])

  const keyExtractor = useCallback((row: T, index: number) => {
    return row.id || `row-${index}`
  }, [])

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className={cn('flex items-center bg-muted/50 border-b px-4', headerClassName)} style={{ height: rowHeight }}>
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex-1 font-medium text-sm truncate"
            style={{ 
              width: column.width || 'auto',
              minWidth: column.width || '100px'
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual scrolling rows */}
      <MemoizedVirtualScroll
        items={data}
        itemHeight={rowHeight}
        containerHeight={containerHeight - rowHeight} // Account for header
        renderItem={renderRow}
        keyExtractor={keyExtractor}
      />
    </div>
  )
}

// Virtual list component for simple lists
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor?: (item: T, index: number) => string
  className?: string
  emptyMessage?: string
  loadingMessage?: string
  isLoading?: boolean
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor = (_, index) => `item-${index}`,
  className,
  emptyMessage = 'No items found',
  loadingMessage = 'Loading...',
  isLoading,
}: VirtualListProps<T>) => {
  if (isLoading) {
    return (
      <div 
        className={cn('flex items-center justify-center', className)}
        style={{ height: containerHeight }}
      >
        <div className="text-muted-foreground">{loadingMessage}</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center', className)}
        style={{ height: containerHeight }}
      >
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <MemoizedVirtualScroll
      items={items}
      itemHeight={itemHeight}
      containerHeight={containerHeight}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      className={className}
    />
  )
}

// Export both named and default exports
export { MemoizedVirtualScroll as VirtualScroll }
export default MemoizedVirtualScroll