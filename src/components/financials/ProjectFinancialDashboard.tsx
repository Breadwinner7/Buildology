import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Enhanced types matching your database schema
interface ProjectFinancials {
  id: string;
  project_id: string;
  budget_total: number;
  budget_allocated: number;
  budget_spent: number;
  budget_remaining: number;
  contract_value: number;
  invoice_total: number;
  payment_received: number;
  payment_outstanding: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  bill_to_organisation?: {
    name: string;
  };
}

interface Payment {
  id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  payment_reference?: string;
}

interface Quote {
  id: string;
  project_id: string;
  quote_number: string;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  valid_until: string;
  contractor?: {
    first_name: string;
    surname: string;
  };
}

// Real API functions
const fetchProjectFinancials = async (projectId: string): Promise<ProjectFinancials | null> => {
  const { data, error } = await supabase
    .from('project_financials')
    .select('*')
    .eq('project_id', projectId)
    .single();
  
  if (error) {
    console.error('Error fetching financials:', error);
    return null;
  }
  
  return data;
};

const fetchProjectInvoices = async (projectId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      bill_to_organisation:organisations(name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
  
  return data || [];
};

const fetchProjectPayments = async (projectId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('payment_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  
  return data || [];
};

const fetchProjectQuotes = async (projectId: string): Promise<Quote[]> => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      contractor:user_profiles(first_name, surname)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
  
  return data || [];
};

// Utility functions
const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'sent':
    case 'pending':
    case 'submitted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'overdue':
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Enhanced Financial Metric Card
interface FinancialMetricCardProps {
  title: string;
  value: number;
  currency?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage?: number };
  progress?: number;
  status?: 'normal' | 'warning' | 'critical';
  description?: string;
}

const FinancialMetricCard: React.FC<FinancialMetricCardProps> = ({
  title,
  value,
  currency = 'GBP',
  trend,
  progress,
  status = 'normal',
  description
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <PoundSterling className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      default:
        return '';
    }
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {getStatusIcon()}
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
  );
};

// Main Enhanced Dashboard Component
export const ProjectFinancialDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: financials, isLoading: financialsLoading, error: financialsError } = useQuery({
    queryKey: ['project-financials', projectId],
    queryFn: () => fetchProjectFinancials(projectId),
    enabled: !!projectId
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['project-invoices', projectId],
    queryFn: () => fetchProjectInvoices(projectId),
    enabled: !!projectId
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['project-payments', projectId],
    queryFn: () => fetchProjectPayments(projectId),
    enabled: !!projectId
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['project-quotes', projectId],
    queryFn: () => fetchProjectQuotes(projectId),
    enabled: !!projectId
  });

  if (financialsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (financialsError || !financials) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-muted-foreground">No financial data available for this project</p>
        <p className="text-xs text-muted-foreground mt-1">
          Financial tracking will appear here once data is added
        </p>
      </div>
    );
  }

  const budgetUtilization = financials.budget_total > 0 
    ? (financials.budget_spent / financials.budget_total) * 100 
    : 0;

  const paymentRate = financials.invoice_total > 0 
    ? (financials.payment_received / financials.invoice_total) * 100 
    : 0;

  const overdueInvoices = invoices.filter(inv => 
    inv.status === 'overdue' || 
    (inv.status === 'sent' && new Date(inv.due_date) < new Date())
  );

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialMetricCard
          title="Total Budget"
          value={financials.budget_total}
          currency={financials.currency}
          description={`Contract value: ${formatCurrency(financials.contract_value, financials.currency)}`}
        />

        <FinancialMetricCard
          title="Budget Spent"
          value={financials.budget_spent}
          currency={financials.currency}
          progress={budgetUtilization}
          status={financials.budget_spent > financials.budget_allocated ? 'warning' : 'normal'}
          description={`${budgetUtilization.toFixed(1)}% of total budget`}
        />

        <FinancialMetricCard
          title="Invoiced Amount"
          value={financials.invoice_total}
          currency={financials.currency}
          description={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} raised`}
        />

        <FinancialMetricCard
          title="Outstanding"
          value={financials.payment_outstanding}
          currency={financials.currency}
          status={overdueInvoices.length > 0 ? 'critical' : 'normal'}
          description={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? 's' : ''}` : 'All payments up to date'}
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
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
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
                <CardDescription>Allocation vs spending</CardDescription>
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
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Invoices</CardTitle>
              <CardDescription>All invoices for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.total_amount, financials.currency)}</p>
                        {invoice.paid_at && (
                          <p className="text-xs text-green-600">Paid {formatDate(invoice.paid_at)}</p>
                        )}
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
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments received for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No payments recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payment.amount, financials.currency)}</p>
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
              <CardTitle>Project Quotes</CardTitle>
              <CardDescription>All quotes received for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No quotes found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(quote.total_amount, financials.currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};