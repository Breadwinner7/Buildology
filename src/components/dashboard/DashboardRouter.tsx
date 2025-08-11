// src/components/dashboard/DashboardRouter.tsx
interface DashboardConfig {
  userRole: string;
  widgets: DashboardWidget[];
  layout: GridLayout;
  permissions: string[];
}

const DASHBOARD_CONFIGS: Record<string, DashboardConfig> = {
  claims_handler: {
    userRole: 'claims_handler',
    widgets: [
      { id: 'pending-tasks', component: 'PendingTasksWidget', size: 'medium' },
      { id: 'recent-documents', component: 'RecentDocumentsWidget', size: 'small' },
      { id: 'approval-requests', component: 'ApprovalRequestsWidget', size: 'small' }
    ],
    layout: { cols: 12, rows: 8 },
    permissions: ['claims.view_assigned', 'documents.upload']
  },
  
  chartered_surveyor: {
    userRole: 'chartered_surveyor',
    widgets: [
      { id: 'survey-schedule', component: 'SurveyScheduleWidget', size: 'large' },
      { id: 'pending-reports', component: 'PendingReportsWidget', size: 'medium' },
      { id: 'travel-schedule', component: 'TravelScheduleWidget', size: 'medium' },
      { id: 'report-templates', component: 'ReportTemplatesWidget', size: 'small' },
      { id: 'regional-workload', component: 'RegionalWorkloadWidget', size: 'small' }
    ],
    layout: { cols: 12, rows: 8 },
    permissions: ['surveys.building', 'reports.technical', 'documents.upload_evidence']
  },
  
  principal_contractor: {
    userRole: 'principal_contractor',
    widgets: [
      { id: 'active-projects', component: 'ActiveProjectsWidget', size: 'large' },
      { id: 'quote-requests', component: 'QuoteRequestsWidget', size: 'medium' },
      { id: 'resource-allocation', component: 'ResourceAllocationWidget', size: 'medium' },
      { id: 'health-safety', component: 'HealthSafetyWidget', size: 'small' },
      { id: 'material-orders', component: 'MaterialOrdersWidget', size: 'small' }
    ],
    layout: { cols: 12, rows: 8 },
    permissions: ['work.undertake_approved', 'quotes.submit', 'progress.report']
  },
  
  policyholder: {
    userRole: 'policyholder',
    widgets: [
      { id: 'claim-status', component: 'ClaimStatusWidget', size: 'large' },
      { id: 'next-appointments', component: 'NextAppointmentsWidget', size: 'medium' },
      { id: 'document-upload', component: 'DocumentUploadWidget', size: 'medium' },
      { id: 'contact-team', component: 'ContactTeamWidget', size: 'small' },
      { id: 'claim-timeline', component: 'ClaimTimelineWidget', size: 'large' }
    ],
    layout: { cols: 12, rows: 10 },
    permissions: ['claim.view_own', 'appointments.schedule', 'documents.upload']
  }
};