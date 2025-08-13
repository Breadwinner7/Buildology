import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Health check endpoint for monitoring system status
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const healthChecks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {} as Record<string, any>
    }

    // Database connectivity check
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('count(*)')
        .limit(1)
        .single()
      
      healthChecks.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - startTime,
        error: error?.message
      }
    } catch (error) {
      healthChecks.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }

    // Memory usage check
    const memoryUsage = process.memoryUsage()
    const memoryThresholdMB = 500 // 500MB threshold
    const currentMemoryMB = memoryUsage.heapUsed / 1024 / 1024

    healthChecks.checks.memory = {
      status: currentMemoryMB > memoryThresholdMB ? 'warning' : 'healthy',
      heapUsed: `${currentMemoryMB.toFixed(2)}MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`,
      threshold: `${memoryThresholdMB}MB`
    }

    // Disk space check (basic)
    healthChecks.checks.disk = {
      status: 'healthy',
      note: 'Basic disk check - implement detailed monitoring in production'
    }

    // Response time check
    const totalResponseTime = Date.now() - startTime
    healthChecks.checks.responseTime = {
      status: totalResponseTime > 5000 ? 'warning' : 'healthy',
      value: `${totalResponseTime}ms`,
      threshold: '5000ms'
    }

    // Overall health determination
    const allChecks = Object.values(healthChecks.checks)
    const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy')
    const hasWarnings = allChecks.some(check => check.status === 'warning')
    
    if (hasUnhealthy) {
      healthChecks.status = 'unhealthy'
    } else if (hasWarnings) {
      healthChecks.status = 'warning'
    } else {
      healthChecks.status = 'healthy'
    }

    healthChecks.checks.totalResponseTime = `${Date.now() - startTime}ms`

    // Return appropriate status code based on health
    const statusCode = healthChecks.status === 'unhealthy' ? 503 : 200

    return NextResponse.json(healthChecks, { status: statusCode })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown health check error',
      responseTime: `${Date.now() - startTime}ms`
    }, { status: 503 })
  }
}

// Readiness probe - checks if the service is ready to serve traffic
export async function HEAD() {
  try {
    // Quick readiness check without full health validation
    const supabase = createClient()
    await supabase.from('projects').select('count(*)').limit(1).single()
    
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}