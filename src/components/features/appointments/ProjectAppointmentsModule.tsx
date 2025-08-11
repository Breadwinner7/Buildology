'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  useAppointments,
  useAppointmentMutations,
  APPOINTMENT_TYPES,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  formatAppointmentTime,
  isAppointmentToday,
  isAppointmentUpcoming,
  canCancelAppointment,
  type EnhancedAppointment,
  type CreateAppointmentData,
  type UpdateAppointmentData
} from '@/hooks/useAppointments'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye
} from 'lucide-react'
import { format, parseISO, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProjectAppointmentsModuleProps {
  projectId: string
}

// Quick appointment card component
function AppointmentCard({ 
  appointment, 
  onEdit, 
  onView, 
  onCancel,
  onComplete
}: { 
  appointment: EnhancedAppointment
  onEdit: () => void
  onView: () => void
  onCancel: () => void
  onComplete: () => void
}) {
  const { user } = useUser()
  const canCancel = canCancelAppointment(appointment.scheduled_start)
  const isOrganizer = user?.id === appointment.organizer_id
  const isToday = isAppointmentToday(appointment.scheduled_start)
  const isUpcoming = isAppointmentUpcoming(appointment.scheduled_start)

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      isToday && "border-blue-200 bg-blue-50/50",
      appointment.status === 'cancelled' && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{appointment.title}</h4>
                <Badge className={cn("text-xs text-white", getAppointmentStatusColor(appointment.status))}>
                  {getAppointmentStatusLabel(appointment.status)}
                </Badge>
                {isToday && (
                  <Badge variant="outline" className="text-xs">TODAY</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {appointment.appointment_type}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {isOrganizer && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {appointment.status === 'scheduled' && isUpcoming && (
                  <DropdownMenuItem onClick={onComplete} className="text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
                {canCancel && appointment.status !== 'cancelled' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onCancel} className="text-red-600">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatAppointmentTime(appointment.scheduled_start, appointment.scheduled_end)}</span>
            </div>
            {appointment.location_address && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-32">{appointment.location_address}</span>
              </div>
            )}
          </div>

          {appointment.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {appointment.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{appointment.attendees.length + 1} people</span>
            </div>

            {appointment.organizer && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={appointment.organizer.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {appointment.organizer.first_name?.[0]}{appointment.organizer.surname?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{appointment.organizer.first_name} {appointment.organizer.surname}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Create appointment dialog
function CreateAppointmentDialog({ 
  open, 
  onOpenChange,
  projectId,
  appointment,
  mode = 'create'
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  appointment?: EnhancedAppointment
  mode?: 'create' | 'edit'
}) {
  const [formData, setFormData] = useState<CreateAppointmentData>({
    project_id: projectId,
    title: appointment?.title || '',
    description: appointment?.description || '',
    appointment_type: appointment?.appointment_type || APPOINTMENT_TYPES[0],
    scheduled_start: appointment?.scheduled_start ? format(parseISO(appointment.scheduled_start), "yyyy-MM-dd'T'HH:mm") : '',
    scheduled_end: appointment?.scheduled_end ? format(parseISO(appointment.scheduled_end), "yyyy-MM-dd'T'HH:mm") : '',
    location_address: appointment?.location_address || '',
    attendees: appointment?.attendees || [],
    access_instructions: appointment?.access_instructions || '',
    special_requirements: appointment?.special_requirements || ''
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('user_profiles').select('id, first_name, surname, role, avatar_url').order('first_name')
      return data || []
    }
  })

  const { createAppointment, updateAppointment } = useAppointmentMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (mode === 'edit' && appointment) {
        await updateAppointment.mutateAsync({
          id: appointment.id,
          data: formData as UpdateAppointmentData
        })
      } else {
        await createAppointment.mutateAsync(formData)
      }
      onOpenChange(false)
      
      if (mode === 'create') {
        setFormData({
          project_id: projectId,
          title: '',
          description: '',
          appointment_type: APPOINTMENT_TYPES[0],
          scheduled_start: '',
          scheduled_end: '',
          location_address: '',
          attendees: [],
          access_instructions: '',
          special_requirements: ''
        })
      }
    } catch (error) {
      console.error('Error saving appointment:', error)
    }
  }

  const toggleAttendee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(userId)
        ? prev.attendees.filter(id => id !== userId)
        : [...prev.attendees, userId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Appointment' : 'Schedule New Appointment'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update appointment details' : 'Create a new appointment for this project'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Title*</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Appointment title..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_type">Type</Label>
              <Select
                value={formData.appointment_type}
                onValueChange={(value) => setFormData({ ...formData, appointment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Start Time*</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_end">End Time*</Label>
              <Input
                id="scheduled_end"
                type="datetime-local"
                value={formData.scheduled_end}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_address">Location</Label>
              <Input
                id="location_address"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Meeting location or address..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Appointment description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Attendees</Label>
            <div className="border rounded-md max-h-32 overflow-y-auto">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleAttendee(user.id)}
                >
                  <Checkbox
                    checked={formData.attendees.includes(user.id)}
                    onChange={() => toggleAttendee(user.id)}
                  />
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.first_name?.[0]}{user.surname?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.first_name} {user.surname}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.attendees.length} attendee{formData.attendees.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="access_instructions">Access Instructions</Label>
              <Textarea
                id="access_instructions"
                value={formData.access_instructions}
                onChange={(e) => setFormData({ ...formData, access_instructions: e.target.value })}
                placeholder="How to access the location..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requirements">Special Requirements</Label>
              <Textarea
                id="special_requirements"
                value={formData.special_requirements}
                onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                placeholder="Any special requirements..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAppointment.isPending || updateAppointment.isPending || !formData.title || !formData.scheduled_start || !formData.scheduled_end}
            >
              {mode === 'edit' 
                ? (updateAppointment.isPending ? 'Updating...' : 'Update')
                : (createAppointment.isPending ? 'Creating...' : 'Schedule')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectAppointmentsModule({ projectId }: ProjectAppointmentsModuleProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editAppointment, setEditAppointment] = useState<EnhancedAppointment | null>(null)
  const [viewAppointment, setViewAppointment] = useState<EnhancedAppointment | null>(null)

  // Fetch appointments for this project
  const appointmentsQuery = useAppointments({ project: [projectId] })
  const { updateAppointment } = useAppointmentMutations()

  const appointments = appointmentsQuery.data || []

  // Filter upcoming and past appointments
  const upcomingAppointments = useMemo(() => {
    const now = new Date()
    return appointments.filter(a => 
      parseISO(a.scheduled_start) > now && a.status !== 'cancelled'
    ).slice(0, 5) // Show only next 5
  }, [appointments])

  const recentAppointments = useMemo(() => {
    const now = new Date()
    return appointments.filter(a => 
      parseISO(a.scheduled_start) <= now || a.status === 'completed'
    ).slice(0, 3) // Show last 3
  }, [appointments])

  const stats = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    
    return {
      total: appointments.length,
      upcoming: appointments.filter(a => parseISO(a.scheduled_start) > now && a.status !== 'cancelled').length,
      today: appointments.filter(a => format(parseISO(a.scheduled_start), 'yyyy-MM-dd') === today && a.status !== 'cancelled').length,
      completed: appointments.filter(a => a.status === 'completed').length
    }
  }, [appointments])

  const handleCancel = async (appointment: EnhancedAppointment) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        data: { status: 'cancelled', cancellation_reason: 'Cancelled by user' }
      })
    } catch (error) {
      console.error('Error cancelling appointment:', error)
    }
  }

  const handleComplete = async (appointment: EnhancedAppointment) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        data: { 
          status: 'completed',
          actual_start: appointment.scheduled_start,
          actual_end: appointment.scheduled_end
        }
      })
    } catch (error) {
      console.error('Error completing appointment:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Appointments</h2>
          <p className="text-sm text-muted-foreground">
            Scheduled meetings, inspections, and site visits
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              <span>{stats.total} total</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{stats.upcoming} upcoming</span>
            </div>
            {stats.today > 0 && (
              <div className="flex items-center gap-1 text-blue-600 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.today} today</span>
              </div>
            )}
          </div>
          
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Upcoming appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Upcoming Appointments</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onEdit={() => setEditAppointment(appointment)}
                onView={() => setViewAppointment(appointment)}
                onCancel={() => handleCancel(appointment)}
                onComplete={() => handleComplete(appointment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent appointments */}
      {recentAppointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Recent Appointments</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onEdit={() => setEditAppointment(appointment)}
                onView={() => setViewAppointment(appointment)}
                onCancel={() => handleCancel(appointment)}
                onComplete={() => handleComplete(appointment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {appointments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No appointments scheduled</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Schedule your first appointment for this project.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Appointment Dialog */}
      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        mode="create"
      />

      <CreateAppointmentDialog
        open={!!editAppointment}
        onOpenChange={() => setEditAppointment(null)}
        projectId={projectId}
        appointment={editAppointment || undefined}
        mode="edit"
      />

      {/* View Appointment Dialog */}
      <Dialog open={!!viewAppointment} onOpenChange={() => setViewAppointment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewAppointment?.title}</DialogTitle>
            <DialogDescription>
              {viewAppointment?.appointment_type} • {viewAppointment && formatAppointmentTime(viewAppointment.scheduled_start, viewAppointment.scheduled_end)}
            </DialogDescription>
          </DialogHeader>
          
          {viewAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={cn("text-xs text-white mt-1", getAppointmentStatusColor(viewAppointment.status))}>
                    {getAppointmentStatusLabel(viewAppointment.status)}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm mt-1">{format(parseISO(viewAppointment.scheduled_start), 'MMM d, yyyy')}</p>
                </div>
              </div>

              {viewAppointment.location_address && (
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{viewAppointment.location_address}</p>
                  </div>
                </div>
              )}

              {viewAppointment.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{viewAppointment.description}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Attendees ({viewAppointment.attendees.length + 1})</Label>
                <div className="mt-2 space-y-2">
                  {viewAppointment.organizer && (
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={viewAppointment.organizer.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {viewAppointment.organizer.first_name?.[0]}{viewAppointment.organizer.surname?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{viewAppointment.organizer.first_name} {viewAppointment.organizer.surname}</span>
                      <Badge variant="secondary" className="text-xs">Organizer</Badge>
                    </div>
                  )}
                  
                  {viewAppointment.attendee_profiles?.map(attendee => (
                    <div key={attendee.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={attendee.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {attendee.first_name?.[0]}{attendee.surname?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{attendee.first_name} {attendee.surname}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewAppointment.access_instructions && (
                <div>
                  <Label className="text-xs text-muted-foreground">Access Instructions</Label>
                  <p className="text-sm mt-1">{viewAppointment.access_instructions}</p>
                </div>
              )}

              {viewAppointment.special_requirements && (
                <div>
                  <Label className="text-xs text-muted-foreground">Special Requirements</Label>
                  <p className="text-sm mt-1">{viewAppointment.special_requirements}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}