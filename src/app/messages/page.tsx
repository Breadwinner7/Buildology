'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  MessageSquare, Search, Filter, Clock, AlertCircle, CheckCircle2,
  User, Calendar, MapPin, Building2, Mail, Phone, Archive,
  MoreVertical, Reply, Forward, Star, Trash2, Eye, Users,
  AlertTriangle, ArrowRight, Paperclip, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_email?: string
  thread_id: string
  thread_title: string
  project_id: string
  project_name: string
  project_reference?: string
  client_name?: string
  created_at: string
  read_status: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  message_type: 'internal' | 'client' | 'contractor' | 'system'
  attachments_count?: number
  region?: string
}

export default function MessagesPage() {
  const router = useRouter()
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('unread')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])

  useEffect(() => {
    fetchMessages()
  }, [activeTab])

  const fetchMessages = async () => {
    setLoading(true)
    
    let query = supabase
      .from('messages_with_context') // This would be a view joining messages with project/thread data
      .select(`
        id, content, sender_id, sender_name, sender_email,
        thread_id, thread_title, project_id, project_name, 
        project_reference, client_name, created_at, read_status,
        priority, message_type, attachments_count, region
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (activeTab === 'unread') {
      query = query.eq('read_status', false)
    } else if (activeTab === 'starred') {
      query = query.eq('starred', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
    } else {
      setMessages(data || [])
    }
    setLoading(false)
  }

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = filterPriority === 'all' || message.priority === filterPriority
    const matchesType = filterType === 'all' || message.message_type === filterType
    
    return matchesSearch && matchesPriority && matchesType
  })

  const handleMessageClick = (message: Message) => {
    // Mark as read
    markAsRead(message.id)
    // Navigate to project message thread
    router.push(`/projects/${message.project_id}?tab=communications&thread=${message.thread_id}`)
  }

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ read_status: true })
      .eq('id', messageId)
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, read_status: true } : msg
    ))
  }

  const markAllAsRead = async () => {
    const unreadIds = filteredMessages.filter(m => !m.read_status).map(m => m.id)
    
    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_status: true })
        .in('id', unreadIds)
      
      setMessages(prev => prev.map(msg => 
        unreadIds.includes(msg.id) ? { ...msg, read_status: true } : msg
      ))
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return <User className="w-4 h-4" />
      case 'contractor': return <Building2 className="w-4 h-4" />
      case 'internal': return <Users className="w-4 h-4" />
      case 'system': return <AlertCircle className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const messageDate = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return messageDate.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const unreadCount = messages.filter(m => !m.read_status).length

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Messages</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Centralized view of all project communications and notifications
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search messages, projects, or contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full lg:w-48">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Message Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="client">Client Messages</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Message Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="grid w-full sm:w-fit grid-cols-3">
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Unread ({messages.filter(m => !m.read_status).length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              All Messages
            </TabsTrigger>
            <TabsTrigger value="starred" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Starred
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {activeTab === 'unread' && unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Button variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'unread' 
                    ? "You're all caught up! No unread messages."
                    : "No messages match your current filters."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <Card 
                  key={message.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md border-l-4",
                    !message.read_status ? "border-l-blue-500 bg-blue-50/30" : "border-l-transparent",
                    "hover:border-l-blue-400"
                  )}
                  onClick={() => handleMessageClick(message)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Message Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(message.message_type)}
                              <span className="font-semibold text-sm capitalize">
                                {message.message_type}
                              </span>
                            </div>
                            
                            <Badge 
                              variant="outline" 
                              className={`${getPriorityColor(message.priority)} text-xs`}
                            >
                              {message.priority}
                            </Badge>

                            {message.attachments_count && message.attachments_count > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Paperclip className="w-3 h-3 mr-1" />
                                {message.attachments_count}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(message.created_at)}
                          </div>
                        </div>

                        {/* Project and Thread Info */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{message.project_name}</span>
                            {message.project_reference && (
                              <span className="text-muted-foreground">#{message.project_reference}</span>
                            )}
                          </div>
                          
                          {message.client_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{message.client_name}</span>
                            </div>
                          )}

                          {message.region && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{message.region}</span>
                            </div>
                          )}
                        </div>

                        {/* Thread Title */}
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{message.thread_title}</span>
                        </div>

                        {/* Sender Info */}
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-xs">
                              {message.sender_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{message.sender_name}</span>
                            {message.sender_email && (
                              <span className="text-muted-foreground ml-2">
                                {message.sender_email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Message Preview */}
                        <div className="bg-muted/30 rounded-lg p-3 border-l-2 border-muted">
                          <p className="text-sm leading-relaxed line-clamp-3">
                            {message.content}
                          </p>
                        </div>
                      </div>

                      {/* Action Arrow */}
                      <div className="flex-shrink-0">
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Results Summary */}
      {filteredMessages.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Showing {filteredMessages.length} of {messages.length} messages
          </p>
        </div>
      )}
    </div>
  )
}