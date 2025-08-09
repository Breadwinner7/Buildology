// src/components/workflow/WorkflowTimeline.tsx
export const WorkflowTimeline: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: project } = useQuery(['project', projectId], () => fetchProject(projectId));
  const { data: stages } = useQuery(['workflow-stages'], fetchWorkflowStages);
  const { data: transitions } = useQuery(['transitions', projectId], () => fetchTransitions(projectId));
  
  const currentStageIndex = stages?.findIndex(stage => stage.name === project?.current_stage) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Progress</CardTitle>
        <p className="text-sm text-muted-foreground">
          Stage {currentStageIndex + 1} of {stages?.length}
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Progress value={(currentStageIndex + 1) / (stages?.length || 1) * 100} />
          
          <div className="relative">
            {stages?.map((stage, index) => (
              <WorkflowStageNode
                key={stage.id}
                stage={stage}
                isActive={index === currentStageIndex}
                isComplete={index < currentStageIndex}
                isPending={index > currentStageIndex}
                canTransition={canUserTransitionTo(stage.name)}
                onTransition={() => handleStageTransition(stage.name)}
              />
            ))}
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium mb-2">Recent Activity</h4>
            <div className="space-y-2">
              {transitions?.slice(0, 3).map(transition => (
                <div key={transition.id} className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline">{transition.to_stage}</Badge>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(transition.created_at))} ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};