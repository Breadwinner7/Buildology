import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Endpoint for receiving logs from client-side
export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json()
    
    if (!Array.isArray(logs)) {
      return NextResponse.json({
        error: 'Invalid logs format. Expected array of log entries.'
      }, { status: 400 })
    }

    // Validate log entries
    const validLogs = logs.filter(log => 
      log.timestamp && 
      log.level && 
      log.message &&
      ['debug', 'info', 'warn', 'error', 'critical'].includes(log.level)
    )

    if (validLogs.length === 0) {
      return NextResponse.json({
        error: 'No valid log entries found'
      }, { status: 400 })
    }

    // In production, you would:
    // 1. Store logs in a time-series database (e.g., InfluxDB, TimeScale)
    // 2. Send to a logging service (e.g., DataDog, New Relic, CloudWatch)
    // 3. Index for search (e.g., Elasticsearch)
    // 4. Set up alerting rules based on error patterns

    // For now, we'll log them server-side and could store in database
    console.log(`📋 Received ${validLogs.length} log entries from client`)
    
    // Log critical errors immediately
    const criticalLogs = validLogs.filter(log => log.level === 'critical')
    if (criticalLogs.length > 0) {
      console.error('🚨 CRITICAL ERRORS RECEIVED:', criticalLogs)
    }

    // Log high-frequency errors
    const errorLogs = validLogs.filter(log => log.level === 'error')
    if (errorLogs.length > 10) {
      console.warn(`⚠️ High error rate: ${errorLogs.length} errors in batch`)
    }

    // Store structured logs (example with Supabase - would need logs table)
    try {
      const supabase = createClient()
      
      // Note: You would need to create a 'logs' table in Supabase for this
      // Example table structure:
      // - id: bigint primary key
      // - timestamp: timestamptz
      // - level: text
      // - message: text
      // - context: jsonb
      // - user_id: uuid
      // - session_id: text
      // - component: text
      // - created_at: timestamptz default now()
      
      const logsToStore = validLogs.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        context: log.context || {},
        user_id: log.userId || null,
        session_id: log.sessionId || null,
        component: log.component || null
      }))

      // Uncomment when logs table exists
      // const { error: insertError } = await supabase
      //   .from('logs')
      //   .insert(logsToStore)
      
      // if (insertError) {
      //   console.error('Failed to store logs in database:', insertError)
      // }
      
    } catch (dbError) {
      console.warn('Database logging not available:', dbError)
    }

    return NextResponse.json({
      status: 'received',
      processed: validLogs.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error processing logs:', error)
    return NextResponse.json({
      error: 'Failed to process logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve logs (for debugging/admin)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const level = url.searchParams.get('level')
    const component = url.searchParams.get('component')
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    const supabase = createClient()
    
    // Note: This would work when logs table exists
    // let query = supabase
    //   .from('logs')
    //   .select('*')
    //   .order('timestamp', { ascending: false })
    //   .range(offset, offset + limit - 1)
    
    // if (level) {
    //   query = query.eq('level', level)
    // }
    
    // if (component) {
    //   query = query.eq('component', component)
    // }
    
    // if (userId) {
    //   query = query.eq('user_id', userId)
    // }
    
    // const { data: logs, error } = await query
    
    // if (error) {
    //   throw error
    // }

    // For now, return placeholder response
    return NextResponse.json({
      logs: [],
      message: 'Logs table not yet implemented. Logs are currently stored in localStorage (development) and server console.',
      filters: { level, component, userId, limit, offset },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to retrieve logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}