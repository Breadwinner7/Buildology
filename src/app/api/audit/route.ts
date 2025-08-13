import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Audit trail API endpoint for compliance and security tracking
export async function POST(request: NextRequest) {
  try {
    const auditEvent = await request.json()
    
    // Validate audit event structure
    if (!auditEvent.action || !auditEvent.resource || !auditEvent.userId) {
      return NextResponse.json({
        error: 'Invalid audit event. Required: action, resource, userId'
      }, { status: 400 })
    }

    // Enhanced validation
    const requiredFields = ['id', 'timestamp', 'userId', 'action', 'resource']
    const missingFields = requiredFields.filter(field => !auditEvent[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    // Log the audit event
    console.log('📋 Audit Event Received:', {
      action: auditEvent.action,
      resource: auditEvent.resource,
      resourceId: auditEvent.resourceId,
      userId: auditEvent.userId,
      userEmail: auditEvent.userEmail,
      timestamp: auditEvent.timestamp
    })

    // In production, store in secure audit database
    try {
      const supabase = createClient()
      
      // Example audit_events table structure:
      // - id: text primary key
      // - timestamp: timestamptz
      // - user_id: uuid
      // - user_email: text
      // - user_role: text
      // - action: text
      // - resource: text
      // - resource_id: text
      // - details: jsonb
      // - ip_address: text
      // - user_agent: text
      // - session_id: text
      // - changes: jsonb
      // - metadata: jsonb
      // - created_at: timestamptz default now()
      
      const auditRecord = {
        id: auditEvent.id,
        timestamp: auditEvent.timestamp,
        user_id: auditEvent.userId,
        user_email: auditEvent.userEmail || null,
        user_role: auditEvent.userRole || null,
        action: auditEvent.action,
        resource: auditEvent.resource,
        resource_id: auditEvent.resourceId || null,
        details: auditEvent.details || {},
        ip_address: auditEvent.ipAddress || getClientIP(request),
        user_agent: auditEvent.userAgent || request.headers.get('user-agent'),
        session_id: auditEvent.sessionId || null,
        changes: auditEvent.changes || null,
        metadata: auditEvent.metadata || {}
      }

      // Uncomment when audit_events table exists
      // const { error: insertError } = await supabase
      //   .from('audit_events')
      //   .insert([auditRecord])
      
      // if (insertError) {
      //   throw insertError
      // }
      
    } catch (dbError) {
      console.error('Failed to store audit event in database:', dbError)
      // Don't fail the request if database storage fails
      // Audit events should still be logged even if persistence fails
    }

    // Handle sensitive actions with additional security measures
    if (isSensitiveAction(auditEvent.action)) {
      await handleSensitiveAuditEvent(auditEvent)
    }

    // Compliance monitoring for specific actions
    if (isComplianceRelevant(auditEvent.action)) {
      await handleComplianceEvent(auditEvent)
    }

    return NextResponse.json({
      status: 'received',
      eventId: auditEvent.id,
      timestamp: new Date().toISOString(),
      message: 'Audit event processed successfully'
    })

  } catch (error) {
    console.error('Error processing audit event:', error)
    return NextResponse.json({
      error: 'Failed to process audit event',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve audit events
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const action = url.searchParams.get('action')
    const resource = url.searchParams.get('resource')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const format = url.searchParams.get('format') || 'json'

    // In production, implement proper authorization
    // Only authorized users should access audit logs
    
    const supabase = createClient()
    
    // Note: This would work when audit_events table exists
    // let query = supabase
    //   .from('audit_events')
    //   .select('*')
    //   .order('timestamp', { ascending: false })
    //   .range(offset, offset + limit - 1)
    
    // // Apply filters
    // if (userId) {
    //   query = query.eq('user_id', userId)
    // }
    // if (action) {
    //   query = query.eq('action', action)
    // }
    // if (resource) {
    //   query = query.eq('resource', resource)
    // }
    // if (startDate) {
    //   query = query.gte('timestamp', startDate)
    // }
    // if (endDate) {
    //   query = query.lte('timestamp', endDate)
    // }
    
    // const { data: events, error, count } = await query
    
    // if (error) {
    //   throw error
    // }

    // For now, return placeholder response
    const auditData = {
      events: [],
      total: 0,
      filters: { userId, action, resource, startDate, endDate },
      pagination: { limit, offset },
      timestamp: new Date().toISOString(),
      message: 'Audit events table not yet implemented. Events are currently logged to console and localStorage.'
    }

    if (format === 'csv') {
      // Return CSV format for compliance exports
      const csv = convertToCSV([]) // Would convert events to CSV
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json(auditData)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to retrieve audit events',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle sensitive audit events with additional security
async function handleSensitiveAuditEvent(event: any) {
  console.warn('🔒 SENSITIVE AUDIT EVENT:', {
    action: event.action,
    user: event.userEmail || event.userId,
    resource: event.resource,
    resourceId: event.resourceId,
    timestamp: event.timestamp
  })

  // In production, implement:
  
  // 1. Immediate notification to security team
  // await notifySecurityTeam({
  //   type: 'sensitive_action',
  //   event,
  //   priority: 'high'
  // })

  // 2. Enhanced logging to secure audit system
  // await logToSecureAuditSystem(event)

  // 3. Real-time monitoring alert
  // await triggerSecurityAlert({
  //   type: 'sensitive_audit_event',
  //   severity: 'high',
  //   details: event
  // })

  // 4. Additional verification log
  // await logAdditionalVerification({
  //   eventId: event.id,
  //   verificationRequired: true,
  //   securityLevel: 'high'
  // })
}

// Handle compliance-relevant events
async function handleComplianceEvent(event: any) {
  console.log('📋 COMPLIANCE EVENT:', {
    action: event.action,
    user: event.userEmail || event.userId,
    timestamp: event.timestamp
  })

  // In production, implement:
  
  // 1. Compliance database logging
  // await logToComplianceSystem(event)

  // 2. Regulatory reporting queue
  // await queueForRegulatoryReporting(event)

  // 3. Data retention policy enforcement
  // await enforceRetentionPolicy(event)

  // 4. Compliance dashboard update
  // await updateComplianceDashboard(event)
}

// Helper functions
function getClientIP(request: NextRequest): string {
  // Extract IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || clientIP || 'unknown'
}

function isSensitiveAction(action: string): boolean {
  const sensitiveActions = [
    'payment.processed',
    'claim.approved',
    'claim.rejected',
    'data.export',
    'sensitive_data.accessed',
    'security.breach_detected',
    'permission.granted',
    'permission.revoked',
    'system.config_changed',
    'user.password_changed',
    'document.deleted'
  ]
  
  return sensitiveActions.includes(action)
}

function isComplianceRelevant(action: string): boolean {
  const complianceActions = [
    'claim.created',
    'claim.updated', 
    'claim.approved',
    'claim.rejected',
    'payment.processed',
    'document.uploaded',
    'document.shared',
    'user.created',
    'user.deactivated',
    'permission.granted',
    'permission.revoked'
  ]
  
  return complianceActions.includes(action)
}

function convertToCSV(events: any[]): string {
  if (events.length === 0) {
    return 'No audit events found'
  }

  const headers = [
    'ID',
    'Timestamp',
    'User ID', 
    'User Email',
    'Action',
    'Resource',
    'Resource ID',
    'IP Address',
    'Details'
  ]

  const rows = events.map(event => [
    event.id,
    event.timestamp,
    event.user_id,
    event.user_email || '',
    event.action,
    event.resource,
    event.resource_id || '',
    event.ip_address || '',
    JSON.stringify(event.details || {})
  ])

  return [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

// DELETE endpoint for audit event management (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get('id')
    const olderThan = url.searchParams.get('olderThan') // ISO date string
    
    if (!eventId && !olderThan) {
      return NextResponse.json({
        error: 'Either event ID or olderThan parameter is required'
      }, { status: 400 })
    }

    // In production, implement proper authorization
    // Only system administrators should be able to delete audit events
    // And only under specific compliance/retention policies

    console.log('🗑️  Audit event deletion requested:', { eventId, olderThan })

    // Log the deletion attempt itself as an audit event
    const deletionAuditEvent = {
      id: `audit_deletion_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'system', // Would be actual admin user
      action: 'audit.event_deleted',
      resource: 'audit_event',
      resourceId: eventId || 'bulk_deletion',
      details: { eventId, olderThan },
      metadata: { reason: 'retention_policy' }
    }

    // Process the deletion audit event
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deletionAuditEvent)
    }).catch(console.warn)

    return NextResponse.json({
      status: 'deleted',
      eventId,
      olderThan,
      timestamp: new Date().toISOString(),
      message: 'Audit event deletion processed (not yet implemented in database)'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete audit event',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}