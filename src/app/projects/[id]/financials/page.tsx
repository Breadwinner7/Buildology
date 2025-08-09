'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  PoundSterling, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Receipt, 
  CreditCard,
  Target,
  Calendar,
  FileText,
  Plus,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

// Types
interface ProjectFinancials {
  id: string
  project_id: string
  budget_total: number
  budget_allocated: number
  budget_spent: number
  budget_remaining: number
  contract_value: number
  invoice_total: number
  payment_received: number
  payment_outstanding: number
  currency: string
  created_at: string
  updated_at: string
}

interface Invoice {
  id: string
  project_id: string
  invoice_number: string
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  due_date: string
  invoice_date: string
  sent_at?: string
  paid_at?: string
  bill_to_organisation?: {
    name: string
  }
  line_items: any[]
}

interface Payment {
  id: string
  project_id: string
  amount: number
  payment_date: string
  status: 'pending' | 'completed' | 'failed'
  payment_method: string
  payment_reference?: string
}

interface Quote {
  id: string
  project_id: string
  quote_number: string
  total_amount: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  valid_until: string
  contractor?: {
    first_name: string
    surname: string
  }
}

// API Functions
const fetchProjectFinancials = async (projectId: string): Promise<ProjectFinancials | null> => {
  const { data, error } = await supabase
    .from('project_financials')
    .select('*')
    .eq('project_id', projectId)
    .single()
  
  if (error) {
    console.error('Error fetching financials:', error)
    return null
  }
  
  return data
}

const fetchProjectInvoices = async (projectId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      bill_to_organisation:organisations(name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  return data || []
}

const fetchProjectPayments = async (projectId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('payment_date', { ascending: false })
  
  return data || []
}

const fetchProjectQuotes = async (projectId: string): Promise<Quote[]> => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      contractor:user_profiles(first_name, surname)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  return data || []
}

// Utility functions
const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'sent':
    case 'pending':
    case 'submitted':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'overdue':
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Financial Metric Card Component
interface FinancialMetricCardProps {
  title: string
  value: number
  currency?: string
  trend?: { direction: 'up' | 'down' | 'stable'; percentage?: number }
  progress?: number
  status?: 'normal' | 'warning' | 'critical'
  description?: string
  icon?: React.ReactNode
}

const FinancialMetricCard: React.FC<FinancialMetricCardProps> = ({
  title,
  value,
  currency = 'GBP',
  trend,
  progress,
  status = 'normal',
  description,
  icon
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'warning':
        return 'border-amber-200 bg-amber-50'
      case 'critical':
        return 'border-red-200 bg-red-50'
      default:
        return ''
    }
  }

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon || <PoundSterling className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(value, currency)}
        </div>
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend.direction === 'up' && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
            {trend.direction === 'down' && <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
            {trend.percentage && (
              <span className={trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trend.percentage}%
              </span>
            )}
          </div>
        )}
        {progress !== undefined && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
            <Progress value={progress} className="flex-1 h-2" />
            <span>{progress.toFixed(1)}%</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Main Project Financials Page
export default function ProjectFinancialsPage() {
  const { id: projectId } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  // Data fetching
  const { data: financials, isLoading: financialsLoading, error: financialsError } = useQuery({
    queryKey: ['project-financials', projectId],
    queryFn: () => fetchProjectFinancials(projectId as string),
    enabled: !!projectId
  })

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['project-invoices', projectId],
    queryFn: () => fetchProjectInvoices(projectId as string),
    enabled: !!projectId
  })

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['project-payments', projectId],
    queryFn: () => fetchProjectPayments(projectId as string),
    enabled: !!projectId
  })

  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['project-quotes', projectId],
    queryFn: () => fetchProjectQuotes(projectId as string),
    enabled: !!projectId
  })

  if (financialsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  if (financialsError || !financials) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Financial Data</h2>
          <p className="text-muted-foreground mb-4">
            Financial tracking will appear here once data is added to this project.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Set Up Project Finances
          </Button>
        </div>
      </div>
    )
  }

  const budgetUtilization = financials.budget_total > 0 
    ? (financials.budget_spent / financials.budget_total) * 100 
    : 0

  const paymentRate = financials.invoice_total > 0 
    ? (financials.payment_received / financials.invoice_total) * 100 
    : 0

  const overdueInvoices = invoices.filter(inv => 
    inv.status === 'overdue' || 
    (inv.status === 'sent' && new Date(inv.due_date) < new Date())
  )

  const pendingQuotes = quotes.filter(q => q.status === 'submitted')
  const recentPayments = payments.filter(p => 
    new Date(p.payment_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Finances</h1>
          <p className="text-muted-foreground">
            Manage budgets, invoices, payments, and quotes for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Invoice
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialMetricCard
          title="Total Budget"
          value={financials.budget_total}
          currency={financials.currency}
          icon={<Target className="h-4 w-4 text-blue-600" />}
          description={`Contract: ${formatCurrency(financials.contract_value, financials.currency)}`}
        />

        <FinancialMetricCard
          title="Budget Spent"
          value={financials.budget_spent}
          currency={financials.currency}
          progress={budgetUtilization}
          status={financials.budget_spent > financials.budget_allocated ? 'warning' : 'normal'}
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          description={`${budgetUtilization.toFixed(1)}% of total budget`}
        />

        <FinancialMetricCard
          title="Invoiced Amount"
          value={financials.invoice_total}
          currency={financials.currency}
          icon={<Receipt className="h-4 w-4 text-purple-600" />}
          description={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} raised`}
        />

        <FinancialMetricCard
          title="Outstanding"
          value={financials.payment_outstanding}
          currency={financials.currency}
          status={overdueInvoices.length > 0 ? 'critical' : 'normal'}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          description={
            overdueInvoices.length > 0 
              ? `${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? 's' : ''}` 
              : 'All payments up to date'
          }
        />
      </div>

      {/* Alert Cards */}
      {(overdueInvoices.length > 0 || pendingQuotes.length > 0 || recentPayments.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overdueInvoices.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800">
                  Overdue Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-900">{overdueInvoices.length}</p>
                <p className="text-xs text-red-700">Require immediate attention</p>
              </CardContent>
            </Card>
          )}

          {pendingQuotes.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">
                  Pending Quotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">{pendingQuotes.length}</p>
                <p className="text-xs text-blue-700">Awaiting approval</p>
              </CardContent>
            </Card>
          )}

          {recentPayments.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800">
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-900">{recentPayments.length}</p>
                <p className="text-xs text-green-700">In the last 7 days</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            {overdueInvoices.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {overdueInvoices.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>How your budget is distributed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Allocated</span>
                    <span>{formatCurrency(financials.budget_allocated, financials.currency)}</span>
                  </div>
                  <Progress 
                    value={(financials.budget_allocated / financials.budget_total) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Spent</span>
                    <span>{formatCurrency(financials.budget_spent, financials.currency)}</span>
                  </div>
                  <Progress 
                    value={budgetUtilization} 
                    className="h-2"
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Remaining</span>
                    <span className={financials.budget_remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(financials.budget_remaining, financials.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Invoice and payment tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Invoiced</span>
                    <span>{formatCurrency(financials.invoice_total, financials.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payments Received</span>
                    <span>{formatCurrency(financials.payment_received, financials.currency)}</span>
                  </div>
                  <Progress 
                    value={paymentRate} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Payment rate: {paymentRate.toFixed(1)}%</span>
                    <span>Outstanding: {formatCurrency(financials.payment_outstanding, financials.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Financial Activity</CardTitle>
              <CardDescription>Latest invoices, payments, and quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Recent Invoices */}
                {invoices.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">Invoice • {formatDate(invoice.invoice_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                      <span className="font-medium">{formatCurrency(invoice.total_amount, financials.currency)}</span>
                    </div>
                  </div>
                ))}

                {/* Recent Payments */}
                {payments.slice(0, 2).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{payment.payment_method}</p>
                        <p className="text-xs text-muted-foreground">Payment • {formatDate(payment.payment_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      <span className="font-medium">{formatCurrency(payment.amount, financials.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Invoices</CardTitle>
                  <CardDescription>All invoices for this project</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No invoices found</p>
                  <Button variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invoice.invoice_number}</span>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Due: {formatDate(invoice.due_date)}
                          {invoice.bill_to_organisation?.name && (
                            <> • {invoice.bill_to_organisation.name}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(invoice.total_amount, financials.currency)}</p>
                          {invoice.paid_at && (
                            <p className="text-xs text-green-600">Paid {formatDate(invoice.paid_at)}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>All payments received for this project</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No payments recorded</p>
                  <Button variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{payment.payment_method}</span>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.payment_date)}
                          {payment.payment_reference && (
                            <> • Ref: {payment.payment_reference}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payment.amount, financials.currency)}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Quotes</CardTitle>
                  <CardDescription>All quotes received for this project</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Quote
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No quotes found</p>
                  <Button variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Request Quote
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{quote.quote_number}</span>
                          <Badge className={getStatusColor(quote.status)}>
                            {quote.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Valid until: {formatDate(quote.valid_until)}
                          {quote.contractor && (
                            <> • {quote.contractor.first_name} {quote.contractor.surname}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(quote.total_amount, financials.currency)}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
                <CardDescription>Budget allocation and spending breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Budget</span>
                    <span className="text-lg font-bold">{formatCurrency(financials.budget_total, financials.currency)}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Allocated</span>
                      <span className="font-medium">{formatCurrency(financials.budget_allocated, financials.currency)}</span>
                    </div>
                    <Progress value={(financials.budget_allocated / financials.budget_total) * 100} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Spent</span>
                      <span className="font-medium">{formatCurrency(financials.budget_spent, financials.currency)}</span>
                    </div>
                    <Progress value={budgetUtilization} className="h-2" />
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Remaining</span>
                      <span className={`font-bold ${financials.budget_remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(financials.budget_remaining, financials.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
                <CardDescription>Key financial indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{budgetUtilization.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Budget Used</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{paymentRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Payment Rate</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{invoices.length}</p>
                    <p className="text-xs text-muted-foreground">Total Invoices</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{overdueInvoices.length}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </div>
                
                {/* Budget Status Indicator */}
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      financials.budget_remaining < 0 ? 'bg-red-500' :
                      budgetUtilization > 90 ? 'bg-amber-500' :
                      'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium">
                      {financials.budget_remaining < 0 ? 'Over Budget' :
                       budgetUtilization > 90 ? 'Near Budget Limit' :
                       'Budget Healthy'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {financials.budget_remaining < 0 
                      ? 'Project is over budget and requires attention'
                      : budgetUtilization > 90 
                      ? 'Approaching budget limit, monitor spending'
                      : 'Budget is within healthy limits'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}