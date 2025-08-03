'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  Plus,
  Hash, 
  Lock, 
  Users, 
  Megaphone, 
  Calendar, 
  Target, 
  FileText, 
  Lightbulb,
  MessageSquare,
  Settings,
  Crown,
  Check,
  ChevronsUpDown,
  X,
  Sparkles,
  Clock,
  Pin,
  Archive,
  Globe
} from 'lucide-react'

interface CreateThreadModalProps {
  projectId: string
  onThreadCreated?: (threadId: string) => void
  triggerVariant?: 'default' | 'outline' | 'ghost'
  triggerSize?: 'sm' | 'default' | 'lg'
}

interface ProjectMember {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url?: string
  is_online?: boolean
}

interface ThreadTemplate {
  id: string
  name: string
  description: string
  title_template: string
  description_template: string
  thread_type: 'public' | 'private' | 'announcement'
  icon: React.ComponentType<{ className?: string }>
}

const THREAD_TEMPLATES: ThreadTemplate[] = [
  {
    id: 'general',
    name: 'General Discussion',
    description: 'Open conversation for team members',
    title_template: 'General Discussion',
    description_template: 'Open discussion thread for all team members to share ideas and updates.',
    thread_type: 'public',
    icon: MessageSquare
  },
  {
    id: 'announcement',
    name: 'Announcements',
    description: 'Important project announcements',
    title_template: 'Project Announcements',
    description_template: 'Important announcements and updates for the project team.',
    thread_type: 'announcement',
    icon: Megaphone
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Meeting discussions and notes',
    title_template: 'Meeting - {date}',
    description_template: 'Discussion thread for meeting notes, action items, and follow-ups.',
    thread_type: 'public',
    icon: Calendar
  },
  {
    id: 'feature',
    name: 'Feature Discussion',
    description: 'Discuss specific features',
    title_template: 'Feature: {feature_name}',
    description_template: 'Discussion thread for planning and implementing new features.',
    thread_type: 'public',
    icon: Lightbulb
  },
  {
    id: 'bug',
    name: 'Bug Reports',
    description: 'Bug tracking and resolution',
    title_template: 'Bug: {bug_title}',
    description_template: 'Thread for tracking and resolving bugs and issues.',
    thread_type: 'public',
    icon: Target
  },
  {
    id: 'private',
    name: 'Private Discussion',
    description: 'Private conversation for selected members',
    title_template: 'Private Discussion',
    description_template: 'Private discussion thread for selected team members.',
    thread_type: 'private',
    icon: Lock
  }
]

export default function CreateThreadModal({ 
  projectId, 
  onThreadCreated, 
  triggerVariant = 'outline',
  triggerSize = 'sm' 
}: CreateThreadModalProps) {
  const { user, isAdmin } = useUser()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [threadType, setThreadType] = useState<'public' | 'private' | 'announcement'>('public')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isPinned, setIsPinned] = useState(false)
  const [allowFileSharing, setAllowFileSharing] = useState(true)
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [autoArchiveAfter, setAutoArchiveAfter] = useState<string>('')

  // Members state
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [membersOpen, setMembersOpen] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Fetch project members
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!projectId || !open) return

      try {
        setLoadingMembers(true)
        const { data, error } = await supabase
          .from('project_members')
          .select(`
            user_id,
            role,
            user_profiles!inner(
              id,
              full_name,
              email,
              avatar_url,
              is_online
            )
          `)
          .eq('project_id', projectId)

        if (error) {
          console.error('Error fetching project members:', error)
          return
        }

        const members = data?.map(member => ({
          id: member.user_profiles.id,
          full_name: member.user_profiles.full_name,
          email: member.user_profiles.email,
          role: member.role,
          avatar_url: member.user_profiles.avatar_url,
          is_online: member.user_profiles.is_online
        })) || []

        setProjectMembers(members)
        
        // Auto-select all members for public threads, current user for private
        if (threadType === 'public') {
          setSelectedMembers(members.map(m => m.id))
        } else {
          setSelectedMembers(user ? [user.id] : [])
        }
      } catch (error) {
        console.error('Error fetching project members:', error)
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchProjectMembers()
  }, [projectId, open, threadType, user])

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = THREAD_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    setTitle(template.title_template)
    setDescription(template.description_template)
    setThreadType(template.thread_type)
    
    // Auto-select members based on thread type
    if (template.thread_type === 'public') {
      setSelectedMembers(projectMembers.map(m => m.id))
    } else if (template.thread_type === 'private' && user) {
      setSelectedMembers([user.id])
    }
  }

  // Handle thread type change
  useEffect(() => {
    if (threadType === 'public') {
      setSelectedMembers(projectMembers.map(m => m.id))
    } else if (threadType === 'private' && user && selectedMembers.length === 0) {
      setSelectedMembers([user.id])
    }
  }, [threadType, projectMembers, user])

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a thread title",
        variant: "destructive"
      })
      return
    }

    if (!user) {
      toast({
        title: "Error", 
        description: "You must be logged in to create threads",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      console.log('🔍 Creating thread:', {
        title: title.trim(),
        project_id: projectId,
        user: user.id
      })

      // Use your original simple structure that was working
      const { data: thread, error } = await supabase
        .from('threads')
        .insert([{ 
          project_id: projectId, 
          title: title.trim(),
          description: description.trim() || null
        }])
        .select()
        .single()

      console.log('📤 Thread creation result:', { thread, error })

      if (error) {
        console.error('❌ Thread creation error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      if (!thread) {
        throw new Error('No thread data returned')
      }

      toast({
        title: "Thread Created Successfully! 🎉",
        description: `"${title}" has been created successfully`,
      })

      // Reset form and close dialog
      resetForm()
      setOpen(false)
      
      // Notify parent component
      if (onThreadCreated) {
        onThreadCreated(thread.id)
      }

    } catch (error: any) {
      console.error('💥 Thread creation error:', error)
      toast({
        title: "Error",
        description: `Failed to create thread: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setActiveTab('details')
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        // Don't allow removing the current user
        if (memberId === user?.id) return prev
        return prev.filter(id => id !== memberId)
      } else {
        return [...prev, memberId]
      }
    })
  }

  const getThreadTypeIcon = (type: string) => {
    switch (type) {
      case 'private': return <Lock className="w-4 h-4" />
      case 'announcement': return <Megaphone className="w-4 h-4" />
      default: return <Hash className="w-4 h-4" />
    }
  }

  const getThreadTypeColor = (type: string) => {
    switch (type) {
      case 'private': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
      case 'announcement': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      default: return 'text-green-600 bg-green-100 dark:bg-green-900/20'
    }
  }

  const getUserInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant} className="gap-2">
          <Plus className="w-4 h-4" />
          New Thread
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Create New Thread
          </DialogTitle>
          <DialogDescription>
            Start a new conversation and collaborate with your team members.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
              {selectedMembers.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedMembers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="mt-4 max-h-96">
            <TabsContent value="details" className="space-y-6 mt-0">
              {/* Templates */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Templates</Label>
                <div className="grid grid-cols-2 gap-3">
                  {THREAD_TEMPLATES.map((template) => {
                    const IconComponent = template.icon
                    return (
                      <Button
                        key={template.id}
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        className="h-auto p-3 flex flex-col items-start gap-2"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <IconComponent className="w-4 h-4" />
                          <span className="font-medium text-sm">{template.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-left leading-relaxed">
                          {template.description}
                        </p>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Basic Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Thread Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter a descriptive title for your thread"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide more context about this thread's purpose..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-20 resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {description.length}/500
                  </div>
                </div>

                {/* Thread Type */}
                <div className="space-y-3">
                  <Label>Thread Type</Label>
                  <RadioGroup 
                    value={threadType} 
                    onValueChange={(value) => setThreadType(value as any)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                      <RadioGroupItem value="public" id="public" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-green-600" />
                          <Label htmlFor="public" className="font-medium">Public Thread</Label>
                          <Badge className={cn("text-xs", getThreadTypeColor('public'))}>
                            <Globe className="w-3 h-3 mr-1" />
                            Open
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          All project members can see and participate
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                      <RadioGroupItem value="private" id="private" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-orange-600" />
                          <Label htmlFor="private" className="font-medium">Private Thread</Label>
                          <Badge className={cn("text-xs", getThreadTypeColor('private'))}>
                            <Lock className="w-3 h-3 mr-1" />
                            Invite Only
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Only selected members can see and participate
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                        <RadioGroupItem value="announcement" id="announcement" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-blue-600" />
                            <Label htmlFor="announcement" className="font-medium">Announcement</Label>
                            <Badge className={cn("text-xs", getThreadTypeColor('announcement'))}>
                              <Crown className="w-3 h-3 mr-1" />
                              Admin Only
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Important announcements - only admins can post
                          </p>
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {threadType === 'public' ? 'All Project Members' : 'Select Members'}
                </Label>
                <Badge variant="secondary">
                  {selectedMembers.length} selected
                </Badge>
              </div>

              {loadingMembers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="w-8 h-8 bg-muted rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="w-24 h-4 bg-muted rounded" />
                        <div className="w-32 h-3 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {projectMembers.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center space-x-3 rounded-lg p-3 border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={member.id}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                        disabled={threadType === 'public' || member.id === user?.id}
                      />
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          {member.avatar_url && (
                            <AvatarImage src={member.avatar_url} alt={member.full_name} />
                          )}
                          <AvatarFallback className="text-xs bg-primary/10">
                            {getUserInitials(member.full_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        {member.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{member.full_name}</p>
                          {member.id === user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {threadType === 'public' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">Public Thread</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    All project members will automatically be added to this thread.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Pin Thread</Label>
                    <p className="text-xs text-muted-foreground">
                      Keep this thread at the top of the list
                    </p>
                  </div>
                  <Switch
                    checked={isPinned}
                    onCheckedChange={setIsPinned}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">File Sharing</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow members to share files and attachments
                    </p>
                  </div>
                  <Switch
                    checked={allowFileSharing}
                    onCheckedChange={setAllowFileSharing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Send notifications for new messages
                    </p>
                  </div>
                  <Switch
                    checked={enableNotifications}
                    onCheckedChange={setEnableNotifications}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="auto-archive">Auto Archive</Label>
                  <Select value={autoArchiveAfter} onValueChange={setAutoArchiveAfter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Never archive automatically" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Never</SelectItem>
                      <SelectItem value="7d">After 7 days of inactivity</SelectItem>
                      <SelectItem value="30d">After 30 days of inactivity</SelectItem>
                      <SelectItem value="90d">After 90 days of inactivity</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Automatically archive this thread after a period of inactivity
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="w-4 h-4" />
            <span>New Thread</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm()
                setOpen(false)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!title.trim() || loading}
              className="min-w-24"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                <>Create Thread</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}