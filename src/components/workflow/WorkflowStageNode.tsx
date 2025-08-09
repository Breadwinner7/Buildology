// src/components/workflow/WorkflowStageNode.tsx
export const WorkflowStageNode: React.FC<WorkflowStageNodeProps> = ({
  stage, isActive, isComplete, isPending, canTransition, onTransition
}) => {
  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 rounded-lg border",
      isActive && "border-blue-200 bg-blue-50",
      isComplete && "border-green-200 bg-green-50",
      isPending && "border-gray-200 bg-gray-50"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        isActive && "bg-blue-500 text-white",
        isComplete && "bg-green-500 text-white",
        isPending && "bg-gray-300 text-gray-600"
      )}>
        {isComplete ? <Check className="w-4 h-4" /> : stage.stage_order}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{stage.name}</h4>
          {stage.sla_hours && (
            <Badge variant="outline">
              SLA: {stage.sla_hours}h
            </Badge>
          )}
        </div>
        
        {stage.required_documents && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground">
              Required: {stage.required_documents.join(', ')}
            </p>
          </div>
        )}
      </div>
      
      {isActive && canTransition && (
        <Button size="sm" onClick={onTransition}>
          Complete
        </Button>
      )}
    </div>
  );
};