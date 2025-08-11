import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  CalendarDays,
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Target,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  FileText,
  TrendingUp,
  Flag,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types matching your database schema
interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'normal' | 'high' | 'critical';
  assigned_to?: string;
  created_by?: string;
  dependencies?: string[];
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

interface WorkflowTransition {
  id: string;
  project_id: string;
  from_stage?: string;
  to_stage: string;
  transitioned_by?: string;
  transition_reason?: string;
  automated: boolean;
  conditions_met?: any;
  created_at: string;
}

interface User {
  id: string;
  first_name: string;
  surname: string;
  email: string;
}

// Mock Supabase client - replace with actual import
const supabase = {
  from: (table: string) => ({
    select: (fields: string) => ({
      eq: (field: string, value: string) => ({
        order: (orderField: string, options?: any) => Promise.resolve({
          data: table === 'project_milestones' ? [
            {
              id: '1',
              project_id: value,
              title: 'Initial Survey',
              description: 'Complete property survey and damage assessment',
              due_date: '2025-02-15',
              completed_date: '2025-01-20',
              status: 'completed',
              priority: 'high',
              assigned_to: 'user1',
              completion_percentage: 100,
              created_at: '2025-01-10',
              dependencies: []
            },
            {
              id: '2',
              project_id: value,
              title: 'Obtain Quotes',
              description: 'Get competitive quotes from approved contractors',
              due_date: '2025-02-28',
              status: 'in_progress',
              priority: 'normal',
              assigned_to: 'user2',
              completion_percentage: 60,
              created_at: '2025-01-15',
              dependencies: ['1']
            },
            {
              id: '3',
              project_id: value,
              title: 'Schedule Works',
              description: 'Confirm start date and access arrangements',
              due_date: '2025-03-15',
              status: 'pending',
              priority: 'normal',
              assigned_to: 'user1',
              completion_percentage: 0,
              created_at: '2025-01-20',
              dependencies: ['2']
            }
          ] : table === 'workflow_transitions' ? [
            {
              id: '1',
              project_id: value,
              from_stage: 'planning',
              to_stage: 'survey_booked',
              transitioned_by: 'user1',
              transition_reason: 'Survey scheduled with contractor',
              automated: false,
              created_at: '2025-01-15'
            },
            {
              id: '2',
              project_id: value,
              from_stage: 'survey_booked',
              to_stage: 'survey_complete',
              transitioned_by: 'user1',
              transition_reason: 'Survey completed, report uploaded',
              automated: false,
              created_at: '2025-01-20'
            }
          ] : table === 'user_profiles' ? [
            {
              id: 'user1',
              first_name: 'John',
              surname: 'Smith',
              email: 'john.smith@buildology.co.uk'
            },
            {
              id: 'user2', 
              first_name: 'Sarah',
              surname: 'Jones',
              email: 'sarah.jones@buildology.co.uk'
            }
          ] : [],
          error: null
        })
      })
    }),
    insert: (data: any) => Promise.resolve({ data, error: null }),
    update: (data: any) => ({
      eq: (field: string, value: string) => Promise.resolve({ data, error: null })
    }),
    delete: () => ({
      eq: (field: string, value: string) => Promise.resolve({ error: null })
    })
  })
};

// API Functions
const fetchProjectMilestones = async (projectId: string): Promise<ProjectMilestone[]> => {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching milestones:', error);
    return [];
  }
  
  return data || [];
};

const fetchWorkflowTransitions = async (projectId: string): Promise<WorkflowTransition[]> => {
  const { data, error } = await supabase
    .from('workflow_transitions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching transitions:', error);
    return [];
  }
  
  return data || [];
};

const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, surname, email')
    .order('first_name');
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data || [];
};

// Utility functions
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Play className="h-4 w-4 text-blue-600" />;
    case 'overdue':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'normal':
      return 'bg-blue-500';
    case 'low':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'No date set';
  return format(new Date(dateString), 'MMM d, yyyy');
};

const isOverdue = (dueDate?: string, status?: string) => {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < new Date();
};

// Create Milestone Dialog Component
const CreateMilestoneDialog: React.FC<{ 
  projectId: string; 
  onMilestoneCreated: () => void;
  users: User[];
}> = ({ projectId, onMilestoneCreated, users }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const createMilestone = async () => {
    const milestoneData = {
      project_id: projectId,
      title,
      description: description || null,
      due_date: dueDate?.toISOString().split('T')[0] || null,
      priority,
      assigned_to: assignedTo || null,
      status: 'pending',
      completion_percentage: 0
    };

    const { error } = await supabase
      .from('project_milestones')
      .insert(milestoneData);

    if (!error) {
      onMilestoneCreated();
      setOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate(undefined);
      setPriority('normal');
      setAssignedTo('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Milestone</DialogTitle>
          <DialogDescription>
            Add a new milestone to track project progress
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter milestone title"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Assign To</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createMilestone} disabled={!title.trim()}>
              Create Milestone
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Milestone Card Component
const MilestoneCard: React.FC<{ 
  milestone: ProjectMilestone; 
  users: User[];
  onUpdate: () => void;
}> = ({ milestone, users, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const assignedUser = users.find(u => u.id === milestone.assigned_to);
  const overdue = isOverdue(milestone.due_date, milestone.status);
  const actualStatus = overdue && milestone.status !== 'completed' ? 'overdue' : milestone.status;

  const updateMilestoneStatus = async (newStatus: string) => {
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'completed' && !milestone.completed_date) {
      updateData.completed_date = new Date().toISOString().split('T')[0];
      updateData.completion_percentage = 100;
    }

    const { error } = await supabase
      .from('project_milestones')
      .update(updateData)
      .eq('id', milestone.id);

    if (!error) {
      onUpdate();
    }
  };

  return (
    <Card className={cn('transition-all duration-200', 
      actualStatus === 'completed' && 'bg-green-50 border-green-200',
      actualStatus === 'overdue' && 'bg-red-50 border-red-200'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('w-2 h-6 rounded-full flex-shrink-0 mt-1', getPriorityColor(milestone.priority))} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(actualStatus)}
                <h3 className={cn('font-medium', actualStatus === 'completed' && 'line-through text-muted-foreground')}>
                  {milestone.title}
                </h3>
                <Badge variant="outline" className={getStatusColor(actualStatus)}>
                  {actualStatus}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {milestone.due_date && (
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    <span className={overdue ? 'text-red-600 font-medium' : ''}>
                      {formatDate(milestone.due_date)}
                    </span>
                  </div>
                )}
                
                {assignedUser && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{assignedUser.first_name} {assignedUser.surname}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{milestone.completion_percentage}%</span>
                </div>
              </div>

              {milestone.completion_percentage > 0 && milestone.completion_percentage < 100 && (
                <div className="mt-2">
                  <Progress value={milestone.completion_percentage} className="h-2" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {milestone.description && (
            <p className="text-sm text-muted-foreground mb-4">{milestone.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {milestone.status !== 'completed' && (
              <>
                {milestone.status === 'pending' && (
                  <Button size="sm" onClick={() => updateMilestoneStatus('in_progress')}>
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                )}
                
                {milestone.status === 'in_progress' && (
                  <Button size="sm" onClick={() => updateMilestoneStatus('completed')}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                )}
              </>
            )}

            <Button variant="outline" size="sm">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>

            {milestone.dependencies && milestone.dependencies.length > 0 && (
              <Badge variant="secondary">
                {milestone.dependencies.length} dependencies
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Main Timeline Component
export const ProjectMilestoneTimeline: React.FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading: milestonesLoading, refetch: refetchMilestones } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => fetchProjectMilestones(projectId),
    enabled: !!projectId
  });

  const { data: transitions = [], isLoading: transitionsLoading } = useQuery({
    queryKey: ['workflow-transitions', projectId],
    queryFn: () => fetchWorkflowTransitions(projectId),
    enabled: !!projectId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  if (milestonesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;
  const overallProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  const overdueMilestones = milestones.filter(m => isOverdue(m.due_date, m.status)).length;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Timeline</CardTitle>
              <CardDescription>
                {completedMilestones} of {totalMilestones} milestones completed
              </CardDescription>
            </div>
            <CreateMilestoneDialog 
              projectId={projectId} 
              onMilestoneCreated={refetchMilestones}
              users={users}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{overallProgress.toFixed(0)}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold">{completedMilestones}</div>
                <div className="text-xs text-muted-foreground">completed</div>
              </div>
            </div>

            {overdueMilestones > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span>{overdueMilestones} milestone{overdueMilestones !== 1 ? 's' : ''} overdue</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Milestones Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first milestone to start tracking project progress
              </p>
              <CreateMilestoneDialog 
                projectId={projectId} 
                onMilestoneCreated={refetchMilestones}
                users={users}
              />
            </CardContent>
          </Card>
        ) : (
          milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              users={users}
              onUpdate={refetchMilestones}
            />
          ))
        )}
      </div>

      {/* Workflow Transitions History */}
      {transitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow History</CardTitle>
            <CardDescription>Recent project stage transitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transitions.map((transition) => {
                const user = users.find(u => u.id === transition.transitioned_by);
                return (
                  <div key={transition.id} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">
                        {transition.from_stage || 'Initial'} → {transition.to_stage}
                      </span>
                      {transition.transition_reason && (
                        <span className="text-muted-foreground ml-2">
                          • {transition.transition_reason}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(transition.created_at), 'MMM d')}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};