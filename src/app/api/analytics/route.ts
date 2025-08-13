import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Analytics endpoint for receiving user behavior data
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()
    
    if (!type || !data) {
      return NextResponse.json({
        error: 'Invalid analytics data. Required: type, data'
      }, { status: 400 })
    }

    // Validate analytics event types
    const validTypes = [
      'pageview',
      'event', 
      'session_ended',
      'error_occurred',
      'performance_metric',
      'business_event'
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: `Invalid analytics type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Log analytics event
    console.log(`📊 Analytics [${type}]:`, {
      timestamp: data.timestamp || new Date().toISOString(),
      userId: data.userId || 'anonymous',
      event: data.event || type,
      properties: data.properties || data
    })

    // In production, you would:
    // 1. Store in analytics database (ClickHouse, BigQuery, etc.)
    // 2. Send to analytics services (Google Analytics, Mixpanel, Amplitude)
    // 3. Process for real-time dashboards
    // 4. Trigger automated insights and alerts

    try {
      const supabase = createClient()
      
      // Example: Store analytics events in database
      // Note: You would need to create an 'analytics_events' table
      // Example table structure:
      // - id: bigint primary key
      // - event_type: text
      // - event_name: text
      // - user_id: uuid
      // - session_id: text
      // - properties: jsonb
      // - timestamp: timestamptz
      // - created_at: timestamptz default now()
      
      const analyticsEvent = {
        event_type: type,
        event_name: data.event || type,
        user_id: data.userId || null,
        session_id: data.sessionId || data.properties?.sessionId || null,
        properties: data.properties || data,
        timestamp: data.timestamp || new Date().toISOString()
      }

      // Uncomment when analytics_events table exists
      // const { error: insertError } = await supabase
      //   .from('analytics_events')
      //   .insert([analyticsEvent])
      
      // if (insertError) {
      //   console.error('Failed to store analytics event:', insertError)
      // }

    } catch (dbError) {
      console.warn('Database analytics storage not available:', dbError)
    }

    // Process specific event types
    switch (type) {
      case 'pageview':
        await processPageView(data)
        break
      case 'event':
        await processEvent(data)
        break
      case 'session_ended':
        await processSessionEnd(data)
        break
      case 'error_occurred':
        await processError(data)
        break
      case 'performance_metric':
        await processPerformance(data)
        break
      case 'business_event':
        await processBusinessEvent(data)
        break
    }

    return NextResponse.json({
      status: 'received',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error processing analytics:', error)
    return NextResponse.json({
      error: 'Failed to process analytics data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Process page view analytics
async function processPageView(data: any) {
  console.log(`📄 Page View: ${data.path}`, {
    title: data.title,
    userId: data.userId || 'anonymous',
    referrer: data.referrer
  })

  // Track popular pages
  const popularPages = getPopularPages()
  const currentHour = new Date().getHours()
  const pageKey = `${data.path}_${currentHour}`
  
  popularPages[pageKey] = (popularPages[pageKey] || 0) + 1
  setPopularPages(popularPages)

  // Identify potential issues
  if (data.path.includes('/error') || data.path.includes('/404')) {
    console.warn('⚠️ Error page view detected:', data.path)
  }
}

// Process custom events
async function processEvent(data: any) {
  const { event, properties = {} } = data
  
  console.log(`🎯 Event: ${event}`, {
    userId: data.userId || 'anonymous',
    properties: Object.keys(properties).length > 0 ? properties : 'none'
  })

  // Track conversion funnels
  if (event === 'claim_created') {
    console.log('💼 Business Goal: Claim Created', {
      claimId: properties.claimId,
      amount: properties.amount,
      currency: properties.currency
    })
  }

  // Track engagement metrics
  if (event === 'button_click' || event === 'link_click') {
    const engagementEvents = getEngagementEvents()
    engagementEvents.push({
      event,
      timestamp: new Date(),
      properties
    })
    setEngagementEvents(engagementEvents)
  }

  // Track errors
  if (event === 'javascript_error' || event === 'error_occurred') {
    console.error('🐛 Client Error Tracked:', properties)
  }
}

// Process session end analytics
async function processSessionEnd(data: any) {
  console.log('📊 Session Ended:', {
    sessionId: data.sessionId,
    userId: data.userId || 'anonymous',
    duration: data.endTime && data.startTime ? 
      new Date(data.endTime).getTime() - new Date(data.startTime).getTime() : 'unknown',
    pageViews: data.pageViews,
    events: data.events,
    device: data.device,
    browser: data.browser
  })

  // Track session quality
  const duration = data.endTime && data.startTime ? 
    new Date(data.endTime).getTime() - new Date(data.startTime).getTime() : 0
  
  if (duration < 10000) { // Less than 10 seconds
    console.warn('⚠️ Bounce session detected (< 10s)')
  } else if (duration > 30 * 60 * 1000) { // More than 30 minutes
    console.log('🎯 High engagement session (> 30min)')
  }
}

// Process error analytics
async function processError(data: any) {
  console.error('🚨 Client Error:', {
    error: data.properties?.errorName || 'Unknown',
    message: data.properties?.errorMessage,
    userId: data.userId || 'anonymous',
    page: data.properties?.page
  })

  // Track error patterns
  const errorPatterns = getErrorPatterns()
  const errorKey = data.properties?.errorName || 'unknown_error'
  errorPatterns[errorKey] = (errorPatterns[errorKey] || 0) + 1
  setErrorPatterns(errorPatterns)

  // Alert on critical errors
  if (errorPatterns[errorKey] > 10) {
    console.warn(`⚠️ High error frequency: ${errorKey} occurred ${errorPatterns[errorKey]} times`)
  }
}

// Process performance analytics
async function processPerformance(data: any) {
  const { properties = {} } = data
  console.log(`⚡ Performance: ${properties.metric}`, {
    value: properties.value,
    unit: properties.unit || 'ms',
    userId: data.userId || 'anonymous'
  })

  // Track performance issues
  if (properties.unit === 'ms' && properties.value > 5000) {
    console.warn('🐌 Slow performance detected:', properties.metric, properties.value + 'ms')
  }
}

// Process business event analytics
async function processBusinessEvent(data: any) {
  console.log('💼 Business Event:', {
    event: data.event,
    userId: data.userId,
    properties: data.properties
  })

  // Track business metrics
  if (data.event === 'payment_processed') {
    console.log('💰 Revenue Event:', {
      amount: data.properties?.amount,
      currency: data.properties?.currency
    })
  }
}

// Simple in-memory storage for demonstration
// In production, use Redis or a proper database
let popularPages: Record<string, number> = {}
let engagementEvents: any[] = []
let errorPatterns: Record<string, number> = {}

function getPopularPages() { return popularPages }
function setPopularPages(pages: Record<string, number>) { popularPages = pages }

function getEngagementEvents() { return engagementEvents.slice(-100) } // Keep last 100
function setEngagementEvents(events: any[]) { engagementEvents = events.slice(-100) }

function getErrorPatterns() { return errorPatterns }
function setErrorPatterns(patterns: Record<string, number>) { errorPatterns = patterns }

// GET endpoint for analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'summary'
    
    const analytics = {
      timestamp: new Date().toISOString(),
      type,
      data: {} as any
    }

    switch (type) {
      case 'popular-pages':
        analytics.data = getPopularPages()
        break
        
      case 'engagement':
        analytics.data = getEngagementEvents()
        break
        
      case 'errors':
        analytics.data = getErrorPatterns()
        break
        
      case 'summary':
      default:
        analytics.data = {
          popularPages: Object.keys(getPopularPages()).length,
          recentEngagements: getEngagementEvents().length,
          errorPatterns: Object.keys(getErrorPatterns()).length,
          topErrors: Object.entries(getErrorPatterns())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5),
          topPages: Object.entries(getPopularPages())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
        }
        break
    }

    return NextResponse.json(analytics)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to retrieve analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}