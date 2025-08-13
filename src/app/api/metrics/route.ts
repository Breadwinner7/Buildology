import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Metrics endpoint for monitoring and analytics
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const timeRange = url.searchParams.get('range') || '1h'
    
    // Calculate time range for metrics
    const now = new Date()
    const since = new Date()
    
    switch (timeRange) {
      case '5m':
        since.setMinutes(now.getMinutes() - 5)
        break
      case '1h':
        since.setHours(now.getHours() - 1)
        break
      case '24h':
        since.setHours(now.getHours() - 24)
        break
      case '7d':
        since.setDate(now.getDate() - 7)
        break
      default:
        since.setHours(now.getHours() - 1)
    }

    const supabase = createClient()
    
    // Collect various metrics
    const metrics = {
      timestamp: now.toISOString(),
      timeRange,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {} as Record<string, any>,
      application: {} as Record<string, any>,
      errors: {} as Record<string, any>
    }

    // Database metrics
    try {
      // Projects count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
      
      // Active projects (updated in last 7 days)
      const { count: activeProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      
      // Users count (if users table exists)
      try {
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
        
        metrics.database.users = userCount || 0
      } catch {
        metrics.database.users = 'N/A'
      }

      metrics.database = {
        ...metrics.database,
        projects: projectCount || 0,
        activeProjects: activeProjects || 0,
        connectionStatus: 'healthy'
      }
    } catch (error) {
      metrics.database = {
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }

    // Application metrics (from localStorage/monitoring data if available)
    metrics.application = {
      responseTime: Date.now() - startTime,
      endpoint: '/api/metrics',
      requestCount: 'N/A', // Would implement request counter in production
      activeUsers: 'N/A',   // Would track via sessions/analytics
      averageLoadTime: 'N/A' // Would track via performance monitoring
    }

    // Error metrics (basic placeholder)
    metrics.errors = {
      totalErrors: 'N/A',    // Would track from monitoring service
      errorRate: 'N/A',      // Would calculate from total requests
      criticalErrors: 'N/A'  // Would filter by severity
    }

    // Format response based on requested format
    if (format === 'prometheus') {
      // Prometheus-style metrics format
      const prometheusMetrics = [
        `# HELP buildology_uptime_seconds Application uptime in seconds`,
        `# TYPE buildology_uptime_seconds gauge`,
        `buildology_uptime_seconds ${process.uptime()}`,
        ``,
        `# HELP buildology_memory_usage_bytes Memory usage in bytes`,
        `# TYPE buildology_memory_usage_bytes gauge`,
        `buildology_memory_usage_bytes{type="heapUsed"} ${metrics.system.memory.heapUsed}`,
        `buildology_memory_usage_bytes{type="heapTotal"} ${metrics.system.memory.heapTotal}`,
        `buildology_memory_usage_bytes{type="external"} ${metrics.system.memory.external}`,
        ``,
        `# HELP buildology_projects_total Total number of projects`,
        `# TYPE buildology_projects_total gauge`,
        `buildology_projects_total ${metrics.database.projects || 0}`,
        ``,
        `# HELP buildology_active_projects Total number of active projects`,
        `# TYPE buildology_active_projects gauge`,
        `buildology_active_projects ${metrics.database.activeProjects || 0}`,
        ``,
        `# HELP buildology_response_time_milliseconds Response time in milliseconds`,
        `# TYPE buildology_response_time_milliseconds gauge`,
        `buildology_response_time_milliseconds{endpoint="/api/metrics"} ${metrics.application.responseTime}`,
      ].join('\n')

      return new NextResponse(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      })
    }

    // Default JSON format
    return NextResponse.json(metrics, { 
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST endpoint for receiving custom metrics from client-side
export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json()
    
    // Validate metrics format
    if (!metrics.name || typeof metrics.value === 'undefined') {
      return NextResponse.json({
        error: 'Invalid metrics format. Required: name, value'
      }, { status: 400 })
    }

    // In production, you would store these metrics in a time-series database
    // For now, we'll just log them
    console.log('📊 Custom metric received:', {
      name: metrics.name,
      value: metrics.value,
      timestamp: metrics.timestamp || new Date().toISOString(),
      labels: metrics.labels || {}
    })

    return NextResponse.json({
      status: 'received',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}