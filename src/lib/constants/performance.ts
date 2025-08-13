// Performance constants
export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE_QUALITY: 75,
  IMAGE_SIZES: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  IMAGE_FORMATS: ['image/webp'],
  
  // Cache settings
  CACHE_TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAY: 86400, // 1 day
  },
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Debounce/Throttle
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  
  // Lazy loading
  INTERSECTION_THRESHOLD: 0.1,
  ROOT_MARGIN: '50px',
  
  // Query optimization
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  REFETCH_ON_WINDOW_FOCUS: false,
  REFETCH_ON_RECONNECT: true,
}

// Web Vitals thresholds
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
  },
  FID: {
    GOOD: 100,
    NEEDS_IMPROVEMENT: 300,
  },
  CLS: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25,
  },
  FCP: {
    GOOD: 1800,
    NEEDS_IMPROVEMENT: 3000,
  },
  TTFB: {
    GOOD: 800,
    NEEDS_IMPROVEMENT: 1800,
  },
}