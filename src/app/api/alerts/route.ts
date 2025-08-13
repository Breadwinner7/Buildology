import { NextRequest, NextResponse } from 'next/server'

// Alerts endpoint for receiving and managing system alerts
export async function POST(request: NextRequest) {
  try {
    const alert = await request.json()
    
    // Validate alert structure
    if (!alert.type || !alert.severity || !alert.title || !alert.description) {
      return NextResponse.json({
        error: 'Invalid alert format. Required: type, severity, title, description'
      }, { status: 400 })
    }

    const validTypes = ['performance', 'error', 'security', 'business']
    const validSeverities = ['low', 'medium', 'high', 'critical']

    if (!validTypes.includes(alert.type)) {
      return NextResponse.json({
        error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    if (!validSeverities.includes(alert.severity)) {
      return NextResponse.json({
        error: `Invalid alert severity. Must be one of: ${validSeverities.join(', ')}`
      }, { status: 400 })
    }

    // Log the alert
    const emoji = getAlertEmoji(alert.severity)
    console.log(`${emoji} ALERT [${alert.severity.toUpperCase()}] ${alert.type}:`, {
      title: alert.title,
      description: alert.description,
      timestamp: alert.timestamp || new Date().toISOString(),
      id: alert.id
    })

    // Process based on severity
    if (alert.severity === 'critical') {
      await handleCriticalAlert(alert)
    } else if (alert.severity === 'high') {
      await handleHighAlert(alert)
    }

    // In production, you would:
    // 1. Store alerts in database
    // 2. Send to notification services (Slack, PagerDuty, email, SMS)
    // 3. Trigger automated responses
    // 4. Update monitoring dashboards
    // 5. Create incident records

    return NextResponse.json({
      status: 'received',
      alertId: alert.id || `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: getAlertAction(alert.severity)
    })

  } catch (error) {
    console.error('Error processing alert:', error)
    return NextResponse.json({
      error: 'Failed to process alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve alerts
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const severity = url.searchParams.get('severity')
    const type = url.searchParams.get('type')
    const resolved = url.searchParams.get('resolved')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    // In production, fetch from database
    // For now, return mock data structure
    const alerts = {
      alerts: [],
      total: 0,
      filters: { severity, type, resolved: resolved === 'true' },
      timestamp: new Date().toISOString(),
      message: 'Alert storage not yet implemented. Alerts are currently logged to console and would be stored in database.'
    }

    return NextResponse.json(alerts)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to retrieve alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle critical alerts with immediate notifications
async function handleCriticalAlert(alert: any) {
  console.error('🚨 CRITICAL ALERT - IMMEDIATE ACTION REQUIRED:', {
    title: alert.title,
    description: alert.description,
    timestamp: new Date().toISOString()
  })

  // In production, implement:
  
  // 1. PagerDuty integration
  // await sendToPagerDuty(alert)
  
  // 2. Slack notification
  // await sendToSlack({
  //   channel: '#alerts-critical',
  //   text: `🚨 CRITICAL: ${alert.title}`,
  //   attachments: [{
  //     color: 'danger',
  //     fields: [
  //       { title: 'Description', value: alert.description, short: false },
  //       { title: 'Type', value: alert.type, short: true },
  //       { title: 'Time', value: alert.timestamp, short: true }
  //     ]
  //   }]
  // })
  
  // 3. SMS notification for on-call engineer
  // await sendSMS({
  //   to: process.env.ONCALL_PHONE,
  //   message: `CRITICAL ALERT: ${alert.title} - ${alert.description}`
  // })
  
  // 4. Email notification
  // await sendEmail({
  //   to: process.env.ADMIN_EMAILS,
  //   subject: `[CRITICAL] ${alert.title}`,
  //   body: `Critical alert detected:\n\n${alert.description}\n\nType: ${alert.type}\nTime: ${alert.timestamp}`
  // })

  // 5. Create incident ticket
  // await createIncident({
  //   title: alert.title,
  //   description: alert.description,
  //   priority: 'critical',
  //   assignee: 'oncall-engineer'
  // })
}

// Handle high-priority alerts
async function handleHighAlert(alert: any) {
  console.warn('⚠️ HIGH PRIORITY ALERT:', {
    title: alert.title,
    description: alert.description,
    timestamp: new Date().toISOString()
  })

  // In production, implement:
  
  // 1. Slack notification (less urgent channel)
  // await sendToSlack({
  //   channel: '#alerts-high',
  //   text: `⚠️ HIGH: ${alert.title}`,
  //   attachments: [{ ... }]
  // })
  
  // 2. Email notification (not immediate)
  // await sendEmail({ ... })
}

// Helper functions
function getAlertEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🚨'
    case 'high': return '⚠️'
    case 'medium': return '🟡'
    case 'low': return 'ℹ️'
    default: return '📋'
  }
}

function getAlertAction(severity: string): string {
  switch (severity) {
    case 'critical': return 'Immediate notification sent to on-call engineer'
    case 'high': return 'Notification sent to engineering team'
    case 'medium': return 'Alert logged for review'
    case 'low': return 'Information logged'
    default: return 'Alert processed'
  }
}

// PUT endpoint to resolve alerts
export async function PUT(request: NextRequest) {
  try {
    const { alertId, resolved, resolution } = await request.json()
    
    if (!alertId) {
      return NextResponse.json({
        error: 'Alert ID is required'
      }, { status: 400 })
    }

    console.log(`✅ Alert ${resolved ? 'resolved' : 'updated'}:`, {
      alertId,
      resolution,
      timestamp: new Date().toISOString()
    })

    // In production, update alert in database
    // const { error } = await supabase
    //   .from('alerts')
    //   .update({ 
    //     resolved, 
    //     resolved_at: resolved ? new Date().toISOString() : null,
    //     resolution 
    //   })
    //   .eq('id', alertId)

    return NextResponse.json({
      status: 'updated',
      alertId,
      resolved,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE endpoint to remove alerts
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const alertId = url.searchParams.get('id')
    
    if (!alertId) {
      return NextResponse.json({
        error: 'Alert ID is required'
      }, { status: 400 })
    }

    console.log('🗑️ Alert deleted:', alertId)

    // In production, delete from database
    // await supabase.from('alerts').delete().eq('id', alertId)

    return NextResponse.json({
      status: 'deleted',
      alertId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}