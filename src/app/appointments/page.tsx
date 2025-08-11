'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  useAppointments,
  useUserAppointments,
  useCalendarEvents,
  useAppointmentMutations,
  APPOINTMENT_TYPES,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  formatAppointmentTime,
  isAppointmentToday,
  canCancelAppointment,
  canRescheduleAppointment,
  type EnhancedAppointment,
  type AppointmentFilters,
  type CreateAppointmentData,
  type UpdateAppointmentData
} from '@/hooks/useAppointments'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  Plus,
  Clock,
  MapPin,
  User,
  Users,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Calendar1,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Eye,
  FileText,
  Navigation
} from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth, addMonths, parseISO, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

// Calendar view component
function AppointmentCalendar({ 
  selectedDate, 
  onDateSelect, 
  appointments 
}: { 
  selectedDate: Date
  onDateSelect: (date: Date) => void
  appointments: EnhancedAppointment[]
}) {
  // Get appointments for each day
  const appointmentsByDate = useMemo(() => {
    const dateMap: Record<string, EnhancedAppointment[]> = {}
    appointments.forEach(appointment => {
      const date = format(parseISO(appointment.scheduled_start), 'yyyy-MM-dd')
      if (!dateMap[date]) dateMap[date] = []
      dateMap[date].push(appointment)
    })
    return dateMap
  }, [appointments])

  const modifiers = useMemo(() => {
    const hasAppointments = Object.keys(appointmentsByDate).map(dateStr => parseISO(`${dateStr}T00:00:00`))
    return {
      hasAppointments
    }
  }, [appointmentsByDate])

  const modifiersClassNames = {
    hasAppointments: 'bg-blue-100 dark:bg-blue-900 font-semibold relative after:absolute after:bottom-1 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-500 after:rounded-full'
  }

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        className="rounded-md border w-full"
      />
    </div>
  )
}

// Appointment card component
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
  const canReschedule = canRescheduleAppointment(appointment.scheduled_start, appointment.status)
  const isOrganizer = user?.id === appointment.organizer_id
  const isToday = isAppointmentToday(appointment.scheduled_start)

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      isToday && "border-blue-200 bg-blue-50/50",
      appointment.status === 'cancelled' && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{appointment.title}</h3>
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
                {(isOrganizer || canReschedule) && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {appointment.status === 'scheduled' && (
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

          {/* Time and duration */}
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

          {/* Description */}
          {appointment.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {appointment.description}
            </p>
          )}

          {/* Project and organizer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {appointment.project && (
                <Badge variant="secondary" className="text-xs">
                  {appointment.project.name}
                </Badge>
              )}
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{appointment.attendees.length + 1} people</span>
              </div>
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

// Create/Edit appointment dialog
function AppointmentDialog({ 
  open, 
  onOpenChange, 
  appointment, 
  mode = 'create' 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: EnhancedAppointment
  mode?: 'create' | 'edit'
}) {
  const [formData, setFormData] = useState<CreateAppointmentData>({
    project_id: appointment?.project_id || '',
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

  // Fetch projects and users
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name')
      return data || []
    }
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
      
      // Reset form if creating
      if (mode === 'create') {
        setFormData({
          project_id: '',
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
            {mode === 'edit' ? 'Update appointment details' : 'Create a new appointment and invite attendees'}
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
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-project">No project</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
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
            <div className="border rounded-md max-h-40 overflow-y-auto">
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
              placeholder="Any special requirements or notes..."
              rows={2}
            />
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
                : (createAppointment.isPending ? 'Creating...' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main appointments page
export default function AppointmentsPage() {
  const { user } = useUser()
  
  const [filters, setFilters] = useState<Partial<AppointmentFilters>>({
    search: '',
    type: [],
    status: [],
    attendee: [],
    project: [],
    myAppointments: false
  })
  const [showFilters, setShowFilters] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editAppointment, setEditAppointment] = useState<EnhancedAppointment | null>(null)
  const [viewAppointment, setViewAppointment] = useState<EnhancedAppointment | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'calendar' | 'list'>('list')

  // Data fetching
  const allAppointmentsQuery = useAppointments(filters)
  const userAppointmentsQuery = useUserAppointments(user?.id)
  const { updateAppointment } = useAppointmentMutations()

  const allAppointments = allAppointmentsQuery.data || []
  const userAppointments = userAppointmentsQuery.data || []
  const isLoading = allAppointmentsQuery.isLoading || userAppointmentsQuery.isLoading

  // Calendar events for selected month
  const startOfCurrentMonth = startOfMonth(selectedDate)
  const endOfCurrentMonth = endOfMonth(selectedDate)
  const calendarEventsQuery = useCalendarEvents(startOfCurrentMonth, endOfCurrentMonth)

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    return allAppointments.filter(appointment => 
      isSameDay(parseISO(appointment.scheduled_start), selectedDate)
    )
  }, [allAppointments, selectedDate])

  // Statistics
  const stats = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    
    const todayAppointments = allAppointments.filter(a => 
      format(parseISO(a.scheduled_start), 'yyyy-MM-dd') === today
    )
    
    const upcomingAppointments = allAppointments.filter(a => 
      parseISO(a.scheduled_start) > now && a.status !== 'cancelled'
    )
    
    const pendingConfirmation = allAppointments.filter(a => 
      a.status === 'scheduled' && a.confirmation_required && parseISO(a.scheduled_start) > now
    )
    
    return {
      total: allAppointments.length,
      today: todayAppointments.length,
      upcoming: upcomingAppointments.length,
      pending: pendingConfirmation.length,
      myAppointments: userAppointments.length
    }
  }, [allAppointments, userAppointments])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointment Scheduling</h1>
            <p className="text-muted-foreground">
              Manage appointments, meetings, and inspections
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className="h-8"
              >
                <FileText className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('calendar')}
                className="h-8"
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Calendar
              </Button>
            </div>
            <Button variant="outline" onClick={() => allAppointmentsQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold text-green-600">{stats.today}</p>
                </div>
                <CalendarCheck className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
                <CalendarClock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Mine</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.myAppointments}</p>
                </div>
                <User className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {view === 'calendar' ? (
          /* Calendar View */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Calendar</CardTitle>
                  <CardDescription>Select a date to view appointments</CardDescription>
                </CardHeader>
                <CardContent>
                  <AppointmentCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    appointments={allAppointments}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Appointments for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                  <CardDescription>
                    {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''} scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDateAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDateAppointments.map((appointment) => (
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
                  ) : (
                    <div className="text-center py-12">
                      <CalendarX className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No appointments</h3>
                      <p className="text-muted-foreground mb-4">
                        No appointments scheduled for this date.
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule Appointment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search appointments..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10 max-w-md"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, myAppointments: !filters.myAppointments })}
                      className={filters.myAppointments ? 'bg-primary text-primary-foreground' : ''}
                    >
                      <User className="w-4 h-4 mr-1" />
                      My Appointments
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="next_week">Next Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointments List */}
            {allAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allAppointments.map((appointment) => (
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
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No appointments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.search ? 'No appointments match your search criteria.' : 'Schedule your first appointment to get started.'}
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create/Edit Appointment Dialog */}
        <AppointmentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          mode="create"
        />

        <AppointmentDialog
          open={!!editAppointment}
          onOpenChange={() => setEditAppointment(null)}
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
                    <Label className="text-xs text-muted-foreground">Project</Label>
                    <p className="text-sm mt-1">{viewAppointment.project?.name || 'No project'}</p>
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
    </div>
  )
}