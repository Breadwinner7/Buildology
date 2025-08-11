'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  DollarSign,
  Building2,
  Users,
  FileSpreadsheet,
  FileImage,
  Printer,
  Share2,
  Mail,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Target,
  Activity,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { withErrorBoundary } from '@/components/ui/error-boundary'

// Mock reports data
const mockReports = [
  {
    id: 'RPT-001',
    name: 'Monthly Claims Summary',
    description: 'Comprehensive overview of claims processed this month',
    type: 'claims',
    category: 'operational',
    schedule: 'monthly',
    lastGenerated: '2024-01-15T10:30:00Z',
    nextScheduled: '2024-02-01T09:00:00Z',
    status: 'active',
    format: ['pdf', 'excel'],
    recipients: ['manager@company.com', 'director@company.com'],
    parameters: {
      dateRange: 'last_month',
      includeCharts: true,
      detailLevel: 'summary'
    }
  },
  {
    id: 'RPT-002',
    name: 'Weekly Performance Dashboard',
    description: 'Key performance indicators and metrics',
    type: 'performance',
    category: 'executive',
    schedule: 'weekly',
    lastGenerated: '2024-01-18T08:00:00Z',
    nextScheduled: '2024-01-25T08:00:00Z',
    status: 'active',
    format: ['pdf'],
    recipients: ['ceo@company.com', 'coo@company.com'],
    parameters: {
      dateRange: 'last_week',
      includeCharts: true,
      detailLevel: 'detailed'
    }
  },
  {
    id: 'RPT-003',
    name: 'Financial Analysis Report',
    description: 'Revenue, costs, and profitability analysis',
    type: 'financial',
    category: 'financial',
    schedule: 'quarterly',
    lastGenerated: '2024-01-01T12:00:00Z',
    nextScheduled: '2024-04-01T12:00:00Z',
    status: 'active',
    format: ['pdf', 'excel'],
    recipients: ['cfo@company.com', 'accountant@company.com'],
    parameters: {
      dateRange: 'last_quarter',
      includeCharts: true,
      detailLevel: 'detailed'
    }
  }
]

const reportTemplates = [
  {
    id: 'TEMP-001',
    name: 'Claims Performance Report',
    description: 'Detailed analysis of claim processing performance',
    type: 'claims',
    estimatedGenerationTime: '2-3 minutes',
    supportedFormats: ['PDF', 'Excel', 'PowerPoint'],
    parameters: ['Date Range', 'Status Filter', 'Priority Filter', 'Detail Level']
  },
  {
    id: 'TEMP-002',
    name: 'Financial Summary Report',
    description: 'Revenue, expenses, and profitability overview',
    type: 'financial',
    estimatedGenerationTime: '1-2 minutes',
    supportedFormats: ['PDF', 'Excel'],
    parameters: ['Date Range', 'Account Filter', 'Currency', 'Chart Style']
  },
  {
    id: 'TEMP-003',
    name: 'Operational Metrics Report',
    description: 'Key operational KPIs and performance metrics',
    type: 'operational',
    estimatedGenerationTime: '3-4 minutes',
    supportedFormats: ['PDF', 'PowerPoint'],
    parameters: ['Date Range', 'Department Filter', 'Metric Selection']
  },
  {
    id: 'TEMP-004',
    name: 'Compliance & Audit Report',
    description: 'Regulatory compliance status and audit trails',
    type: 'compliance',
    estimatedGenerationTime: '4-5 minutes',
    supportedFormats: ['PDF', 'Excel'],
    parameters: ['Date Range', 'Regulation Type', 'Compliance Level']
  }
]

const exportFormats = [
  { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Printable PDF format' },
  { value: 'excel', label: 'Excel Spreadsheet', icon: FileSpreadsheet, description: 'Editable Excel format' },
  { value: 'powerpoint', label: 'PowerPoint Presentation', icon: FileImage, description: 'Presentation format' },
  { value: 'csv', label: 'CSV Data', icon: FileText, description: 'Raw data export' }
]

const scheduleOptions = [
  { value: 'once', label: 'One-time', description: 'Generate once immediately' },
  { value: 'daily', label: 'Daily', description: 'Every day at specified time' },
  { value: 'weekly', label: 'Weekly', description: 'Every week on specified day' },
  { value: 'monthly', label: 'Monthly', description: 'Every month on specified date' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every quarter' }
]

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500', variant: 'default' as const },
  paused: { label: 'Paused', color: 'bg-yellow-500', variant: 'secondary' as const },
  inactive: { label: 'Inactive', color: 'bg-gray-500', variant: 'outline' as const },
  error: { label: 'Error', color: 'bg-red-500', variant: 'destructive' as const }
}

interface ReportingDashboardProps {
  className?: string
}

export function ReportingDashboard({ className }: ReportingDashboardProps) {
  const [selectedView, setSelectedView] = useState('reports')
  const [showNewReportDialog, setShowNewReportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [generatingReports, setGeneratingReports] = useState<string[]>([])

  // New report form state
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    template: '',
    schedule: 'once',
    format: ['pdf'],
    recipients: [],
    dateRange: 'last_month',
    includeCharts: true,
    detailLevel: 'summary'
  })

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReports(prev => [...prev, reportId])
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setGeneratingReports(prev => prev.filter(id => id !== reportId))
    
    // Show success notification or download
    console.log(`Report ${reportId} generated successfully`)
  }

  const handleExportReport = async (reportId: string, formats: string[]) => {
    console.log(`Exporting report ${reportId} in formats:`, formats)
    // Implement export logic
  }

  const ReportCard = ({ report }: { report: typeof mockReports[0] }) => {
    const isGenerating = generatingReports.includes(report.id)
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-lg">{report.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
              </div>
              <Badge variant={statusConfig[report.status as keyof typeof statusConfig]?.variant}>
                {statusConfig[report.status as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium capitalize">{report.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Schedule:</span>
                <p className="font-medium capitalize">{report.schedule}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Generated:</span>
                <p className="font-medium">{format(new Date(report.lastGenerated), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Next Scheduled:</span>
                <p className="font-medium">{format(new Date(report.nextScheduled), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Formats:</span>
              {report.format.map((format) => (
                <Badge key={format} variant="outline" className="text-xs">
                  {format.toUpperCase()}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerateReport(report.id)}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Now
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedReport(report.id)}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const TemplateCard = ({ template }: { template: typeof reportTemplates[0] }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{template.name}</h3>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Generation Time:</span>
              <p className="font-medium">{template.estimatedGenerationTime}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium capitalize">{template.type}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Supported Formats:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {template.supportedFormats.map((format) => (
                <Badge key={format} variant="outline" className="text-xs">
                  {format}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Parameters:</span>
            <div className="flex flex-wrap gap-1">
              {template.parameters.map((param) => (
                <Badge key={param} variant="secondary" className="text-xs">
                  {param}
                </Badge>
              ))}
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={() => {
              setNewReport(prev => ({ ...prev, template: template.id }))
              setShowNewReportDialog(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">Generate comprehensive reports and export data</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Quick Export
          </Button>
          <Button onClick={() => setShowNewReportDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Reports</p>
                <p className="text-3xl font-bold">{mockReports.filter(r => r.status === 'active').length}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold">47</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +23% from last month
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Export Downloads</p>
                <p className="text-3xl font-bold">284</p>
                <p className="text-sm text-muted-foreground">This quarter</p>
              </div>
              <Download className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled Reports</p>
                <p className="text-3xl font-bold">{mockReports.length}</p>
                <p className="text-sm text-muted-foreground">Next: Today 9 AM</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">My Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Manage automated report generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReports.filter(r => r.schedule !== 'once').map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{report.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {report.schedule} • Next: {format(new Date(report.nextScheduled), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[report.status as keyof typeof statusConfig]?.variant}>
                        {statusConfig[report.status as keyof typeof statusConfig]?.label}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        {report.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Report Dialog */}
      <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Report</DialogTitle>
            <DialogDescription>Configure a new report or set up automated generation</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  value={newReport.name}
                  onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter report name"
                />
              </div>
              <div>
                <Label htmlFor="template">Template</Label>
                <Select value={newReport.template} onValueChange={(value) => setNewReport(prev => ({ ...prev, template: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newReport.description}
                onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this report will contain"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Schedule</Label>
                <Select value={newReport.schedule} onValueChange={(value) => setNewReport(prev => ({ ...prev, schedule: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Export Formats</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {exportFormats.map((format) => (
                    <div key={format.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={format.value}
                        checked={newReport.format.includes(format.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewReport(prev => ({ ...prev, format: [...prev.format, format.value] }))
                          } else {
                            setNewReport(prev => ({ ...prev, format: prev.format.filter(f => f !== format.value) }))
                          }
                        }}
                      />
                      <Label htmlFor={format.value} className="text-sm">{format.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              console.log('Creating report:', newReport)
              setShowNewReportDialog(false)
            }}>
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Data Export</DialogTitle>
            <DialogDescription>Export data for immediate download</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {exportFormats.map((format) => {
                const Icon = format.icon
                return (
                  <Button
                    key={format.value}
                    variant="outline"
                    className="h-auto p-4 flex-col gap-2"
                    onClick={() => console.log('Quick export as', format.value)}
                  >
                    <Icon className="w-6 h-6" />
                    <div className="text-center">
                      <div className="font-medium">{format.label}</div>
                      <div className="text-xs text-muted-foreground">{format.description}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default withErrorBoundary(ReportingDashboard)