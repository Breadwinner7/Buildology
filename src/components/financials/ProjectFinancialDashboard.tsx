// src/components/financials/ProjectFinancialDashboard.tsx
export const ProjectFinancialDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: financials } = useQuery(
    ['project-financials', projectId],
    () => fetchProjectFinancials(projectId)
  );
  
  const { data: payments } = useQuery(
    ['payments', projectId],
    () => fetchProjectPayments(projectId)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <FinancialMetricCard
        title="Total Budget"
        value={financials?.budget_total}
        currency="GBP"
        trend={{ direction: 'stable' }}
      />
      
      <FinancialMetricCard
        title="Allocated"
        value={financials?.budget_allocated}
        currency="GBP"
        progress={(financials?.budget_allocated / financials?.budget_total) * 100}
      />
      
      <FinancialMetricCard
        title="Spent"
        value={financials?.budget_spent}
        currency="GBP"
        progress={(financials?.budget_spent / financials?.budget_total) * 100}
        status={financials?.budget_spent > financials?.budget_allocated ? 'warning' : 'normal'}
      />
      
      <FinancialMetricCard
        title="Remaining"
        value={financials?.budget_remaining}
        currency="GBP"
        status={financials?.budget_remaining < 0 ? 'critical' : 'normal'}
      />
      
      <div className="col-span-full">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financials?.breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};