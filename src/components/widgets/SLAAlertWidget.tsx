// src/components/widgets/SLAAlertWidget.tsx
export const SLAAlertWidget: React.FC = () => {
  const { data: slaBreaches } = useQuery({
    queryKey: ['sla-breaches'],
    queryFn: fetchSLABreaches,
    refetchInterval: 30000 // Real-time updates
  });

  return (
    <Card className="h-full border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">SLA Alerts</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {slaBreaches?.map(breach => (
            <div key={breach.id} className="flex items-center justify-between p-2 bg-white rounded border">
              <div>
                <p className="font-medium text-sm">{breach.project_name}</p>
                <p className="text-xs text-muted-foreground">
                  {breach.stage} • Overdue by {breach.hours_overdue}h
                </p>
              </div>
              <Badge variant="destructive">Urgent</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};