// src/components/widgets/MyClaimsWidget.tsx
export const MyClaimsWidget: React.FC = () => {
  const { userProfile, getClaimsListQuery } = useUKInsurancePermissions();
  const query = getClaimsListQuery();
  
  const { data: claims, isLoading } = useQuery({
    queryKey: ['claims', query.scope, query.filter],
    queryFn: () => fetchClaimsWithWorkflow(query)
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Claims</CardTitle>
        <Badge variant="secondary">{claims?.length || 0}</Badge>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-2">
          {claims?.map(claim => (
            <ClaimWorkflowCard 
              key={claim.id}
              claim={claim}
              showActions={true}
              compactView={true}
            />
          ))}
        </div>
        
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full">
            View All Claims
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
