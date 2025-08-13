'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { 
  useDocumentApprovals, 
  useApprovalMutations,
  getApprovalStatusColor,
  getApprovalStatusLabel,
  getReviewStatusColor,
  getReviewStatusLabel,
  getRequiredApprovalLevel,
  requiresApproval,
  requiresReview
} from '@/hooks/useDocumentApprovals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  FileText, 
  Trash2, 
  Upload, 
  Download, 
  Eye, 
  MoreVertical,
  Image as ImageIcon,
  FileIcon,
  Calendar,
  User,
  Search,
  Filter,
  Grid,
  List,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Users,
  MessageSquare,
  ChevronDown,
  Plus
} from 'lucide-react'

interface Document {
  id: string
  name: string
  path: string
  type: string
  note?: string
  uploaded_at: string
  user_id: string
  file_size?: number
  workflow_stage?: string
  approval_status?: 'pending' | 'approved' | 'rejected' | 'auto_approved'
  approved_by?: string
  approved_at?: string
  visibility_level?: 'internal' | 'contractors' | 'customers' | 'public'
  uploaded_by?: {
    id: string
    email: string
    first_name?: string
    surname?: string
    preferred_name?: string
  }
  approved_by_user?: {
    id: string
    first_name: string
    surname: string
    role: string
  }
}

interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

const documentTypes = [
  'All',
  'Contract',
  'Invoice',
  'Quote',
  'Report',
  'Photos - Before',
  'Photos - During',
  'Photos - After',
  'Photos - Damage',
  'Technical Drawing',
  'Specification',
  'Correspondence',
  'Insurance Document',
  'Certificate',
  'Schedule',
  'Policy Document',
  'Claims Document',
  'Other',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
]

const visibilityOptions = [
  {
    value: 'internal',
    label: 'Internal Only',
    description: 'Visible to internal staff and management only',
    icon: '🏢',
    color: 'text-slate-600'
  },
  {
    value: 'contractors',
    label: 'Internal + Contractors', 
    description: 'Visible to internal staff and approved contractor network',
    icon: '👷',
    color: 'text-blue-600'
  },
  {
    value: 'customers',
    label: 'Internal + Customers',
    description: 'Visible to internal staff and relevant policyholders/customers',
    icon: '👥',
    color: 'text-green-600'
  },
  {
    value: 'public',
    label: 'Public Access',
    description: 'Publicly accessible document (use with caution)',
    icon: '🌐',
    color: 'text-orange-600'
  }
] as const

export default function DocumentsModule({ projectId }: { projectId: string }) {
  const { user, isAdmin } = useUser()
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredType, setFilteredType] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('Report')
  const [visibleToSuppliers, setVisibleToSuppliers] = useState(false)
  const [visibleToPolicyholders, setVisibleToPolicyholders] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [note, setNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [uploaderFilter, setUploaderFilter] = useState<string>('all')
  const [uploaders, setUploaders] = useState<{id: string, name: string}[]>([])
  const [hoveredDocument, setHoveredDocument] = useState<Document | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editVisibleToSuppliers, setEditVisibleToSuppliers] = useState(false)
  const [editVisibleToPolicyholders, setEditVisibleToPolicyholders] = useState(false)
  const [editVisibility, setEditVisibility] = useState('internal')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [approvalDocument, setApprovalDocument] = useState<Document | null>(null)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewDocument, setReviewDocument] = useState<Document | null>(null)
  const [reviewComments, setReviewComments] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'review'>('all')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [showUploadSection, setShowUploadSection] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Approval mutations
  const { approveDocument, rejectDocument, reviewDocument: reviewDocumentMutation } = useApprovalMutations()

  // Multi-select functions
  const handleDocumentClick = (doc: Document, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd click - toggle selection
      setIsMultiSelectMode(true)
      const newSelected = new Set(selectedDocuments)
      if (newSelected.has(doc.id)) {
        newSelected.delete(doc.id)
      } else {
        newSelected.add(doc.id)
      }
      setSelectedDocuments(newSelected)
      
      // If no documents selected, exit multi-select mode
      if (newSelected.size === 0) {
        setIsMultiSelectMode(false)
      }
    } else if (isMultiSelectMode) {
      // In multi-select mode, regular click also toggles
      const newSelected = new Set(selectedDocuments)
      if (newSelected.has(doc.id)) {
        newSelected.delete(doc.id)
      } else {
        newSelected.add(doc.id)
      }
      setSelectedDocuments(newSelected)
    }
  }

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      // Deselect all
      setSelectedDocuments(new Set())
      setIsMultiSelectMode(false)
    } else {
      // Select all visible documents
      const allIds = new Set(filteredDocuments.map(doc => doc.id))
      setSelectedDocuments(allIds)
      setIsMultiSelectMode(true)
    }
  }

  const exitMultiSelectMode = () => {
    setSelectedDocuments(new Set())
    setIsMultiSelectMode(false)
  }

  const handleBulkDownload = async () => {
    const selectedDocs = filteredDocuments.filter(doc => selectedDocuments.has(doc.id))
    for (const doc of selectedDocs) {
      await handleDownload(doc)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedDocuments.size} documents?`)) return
    
    const selectedDocs = filteredDocuments.filter(doc => selectedDocuments.has(doc.id))
    for (const doc of selectedDocs) {
      if (isAdmin || doc.user_id === user?.id) {
        await handleDelete(doc)
      }
    }
    exitMultiSelectMode()
  }

  const handleBulkReview = async () => {
    const selectedDocs = filteredDocuments.filter(doc => 
      selectedDocuments.has(doc.id) && 
      doc.review_status === 'unreviewed' && 
      requiresReview(doc.type)
    )
    
    if (selectedDocs.length === 0) {
      toast({
        title: "No Documents to Review",
        description: "No unreviewed documents selected that require review",
        variant: "destructive",
      })
      return
    }

    try {
      for (const doc of selectedDocs) {
        await reviewDocumentMutation.mutateAsync({ 
          documentId: doc.id, 
          comments: `Bulk reviewed with ${selectedDocs.length - 1} other documents`
        })
      }
      
      toast({
        title: "Documents Reviewed",
        description: `${selectedDocs.length} documents marked as reviewed`,
      })
      
      fetchDocuments()
      exitMultiSelectMode()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to review documents: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Hover preview handlers
  const handleMouseEnter = (doc: Document) => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    const timeout = setTimeout(() => {
      setHoveredDocument(doc)
    }, 300) // 300ms delay before showing preview
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    setHoveredDocument(null)
  }

  // QuickPreview component
  const QuickPreview = ({ doc }: { doc: Document }) => {
    const [previewImageSrc, setPreviewImageSrc] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const getPreviewUrl = async () => {
        if (isImage(doc.name)) {
          try {
            const { data, error } = await supabase.storage
              .from('documents')
              .createSignedUrl(doc.path, 60 * 5)

            if (error) throw error
            if (data?.signedUrl) setPreviewImageSrc(data.signedUrl)
          } catch (error) {
            console.log('Preview error:', error)
          }
        }
        setLoading(false)
      }

      getPreviewUrl()
    }, [doc.path, doc.name])

    return (
      <div className="w-80 p-4 bg-background border rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0">
            {getFileIcon(doc.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate" title={doc.name}>
              {doc.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{doc.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(doc.file_size)}
              </span>
            </div>
          </div>
        </div>

        {/* Image Preview */}
        {isImage(doc.name) && (
          <div className="mb-3">
            {loading ? (
              <div className="aspect-video bg-muted rounded flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : previewImageSrc ? (
              <img 
                src={previewImageSrc} 
                alt={doc.name} 
                className="w-full aspect-video object-cover rounded border"
              />
            ) : (
              <div className="aspect-video bg-muted rounded flex items-center justify-center text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </div>
        )}

        {/* Document Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span>
              {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
            </span>
          </div>
          
          {doc.uploaded_by && (
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-muted-foreground" />
              <span>
                {doc.uploaded_by.preferred_name || 
                 (doc.uploaded_by.first_name && doc.uploaded_by.surname ? 
                  `${doc.uploaded_by.first_name} ${doc.uploaded_by.surname}` : 
                  doc.uploaded_by.email)}
              </span>
            </div>
          )}

          {doc.note && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{doc.note}</span>
            </div>
          )}

          {/* Status and Visibility Information */}
          <div className="flex flex-wrap gap-1 mt-2">
            {doc.approval_status === 'pending' && (
              <Badge className={cn("text-xs", getApprovalStatusColor(doc.approval_status))}>
                {getApprovalStatusLabel(doc.approval_status)}
              </Badge>
            )}
            {doc.approval_status === 'rejected' && (
              <Badge className={cn("text-xs", getApprovalStatusColor(doc.approval_status))}>
                {getApprovalStatusLabel(doc.approval_status)}
              </Badge>
            )}
            {doc.review_status === 'unreviewed' && requiresReview(doc.type) && (
              <Badge className={cn("text-xs", getReviewStatusColor(doc.review_status))}>
                {getReviewStatusLabel(doc.review_status)}
              </Badge>
            )}
            {doc.visibility_level && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", getVisibilityInfo(doc.visibility_level).color)}
              >
                <span className="mr-1">{getVisibilityInfo(doc.visibility_level).icon}</span>
                {getVisibilityInfo(doc.visibility_level).label}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    console.log('🎯 DocumentsModule received projectId:', projectId, typeof projectId)
    fetchDocuments()
  }, [projectId])

  const fetchDocuments = async () => {
    console.log('🔍 Starting fetchDocuments for projectId:', projectId, typeof projectId)
    
    if (!projectId || projectId === 'undefined') {
      console.error('❌ Invalid projectId:', projectId)
      toast({
        title: "Error",
        description: "Invalid project ID",
        variant: "destructive",
      })
      return
    }
    
    
    try {
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('👤 Current user:', { 
        userId: user?.id, 
        userError,
        userEmail: user?.email,
        userRole: user?.user_metadata?.role 
      })
      
      if (!user) {
        console.error('❌ No authenticated user found')
        toast({
          title: "Authentication Error",
          description: "Please log in to view documents",
          variant: "destructive",
        })
        return
      }

      // Check if user profile exists and is active
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role, is_active')
        .eq('id', user.id)
        .single()

      console.log('👤 User profile:', { 
        profile, 
        profileError,
        isActive: profile?.is_active
      })

      if (profileError || !profile || !profile.is_active) {
        console.error('❌ User profile issue:', { profileError, profile })
        toast({
          title: "Profile Error",
          description: "User profile not found or inactive",
          variant: "destructive",
        })
        return
      }
      
      // Now that RLS is fixed, try the normal document query
      console.log('🔍 Fetching documents with fixed RLS...')
      console.log('🔍 Project ID being queried:', projectId, typeof projectId)
      
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      console.log('📄 Documents query result:', { 
        dataCount: documentsData?.length, 
        error: documentsError,
        errorCode: documentsError?.code,
        errorMessage: documentsError?.message,
        sampleDoc: documentsData?.[0]
      })

      if (documentsError) {
        console.error('❌ Document query failed:', documentsError)
        toast({
          title: "Query Error",
          description: `Failed to load documents: ${documentsError.message}`,
          variant: "destructive",
        })
        return
      }

      if (!documentsData || documentsData.length === 0) {
        console.log('📄 No documents found for project:', projectId)
        setDocuments([])
        return
      }

      // Manually fetch user data for each document
      console.log('🔍 Enriching documents with user data...')
      const enrichedData = await Promise.all(
        documentsData.map(async (doc) => {
          let uploaded_by = null
          let approved_by_user = null
          
          // Fetch uploaded_by user data
          if (doc.user_id) {
            try {
              const { data: userData } = await supabase
                .from('user_profiles')
                .select('id, email, first_name, surname, preferred_name')
                .eq('id', doc.user_id)
                .single()
              uploaded_by = userData
            } catch (error) {
              console.log('Could not fetch user data for:', doc.user_id)
            }
          }
          
          // Fetch approved_by user data
          if (doc.approved_by) {
            try {
              const { data: approverData } = await supabase
                .from('user_profiles')
                .select('id, first_name, surname, role')
                .eq('id', doc.approved_by)
                .single()
              approved_by_user = approverData
            } catch (error) {
              console.log('Could not fetch approver data for:', doc.approved_by)
            }
          }
          
          return {
            ...doc,
            uploaded_by,
            approved_by_user
          }
        })
      )
      
      console.log('✅ Successfully fetched and enriched documents:', enrichedData.length)
      setDocuments(enrichedData)
      
      // Extract unique uploaders for filter dropdown
      const uniqueUploaders = Array.from(
        new Map(
          enrichedData
            .filter(doc => doc.uploaded_by)
            .map(doc => [
              doc.user_id, 
              {
                id: doc.user_id,
                name: doc.uploaded_by?.preferred_name || 
                      (doc.uploaded_by?.first_name && doc.uploaded_by?.surname ? 
                       `${doc.uploaded_by.first_name} ${doc.uploaded_by.surname}` : 
                       doc.uploaded_by?.email || 'Unknown')
              }
            ])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name))
      
      setUploaders(uniqueUploaders)
      
    } catch (error: any) {
      console.error('💥 Unexpected error:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} is too large. Maximum size is 50MB.`
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type ${file.type} is not allowed for ${file.name}.`
    }
    return null
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
    } else {
      setSelectedFiles([])
    }
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    
    // Update the file input
    if (fileInputRef.current) {
      const dt = new DataTransfer()
      newFiles.forEach(file => dt.items.add(file))
      fileInputRef.current.files = dt.files
    }
  }

  const handleUpload = async () => {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0 || !user) {
      console.log('❌ Upload validation failed:', { 
        filesCount: files?.length, 
        hasUser: !!user 
      })
      return
    }
    
    // Validate all files first
    const validationErrors: string[] = []
    Array.from(files).forEach(file => {
      const error = validateFile(file)
      if (error) validationErrors.push(error)
    })

    if (validationErrors.length > 0) {
      toast({
        title: "Upload Error",
        description: validationErrors.join('\n'),
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const progressArray: UploadProgress[] = Array.from(files).map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading' as const
    }))
    setUploadProgress(progressArray)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        console.log(`🔄 Starting upload for file: ${file.name}`)
        
        // Update progress for current file
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, progress: 25, status: 'uploading' } : item
        ))

        const fileExt = file.name.split('.').pop()
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${projectId}/${filename}`

        console.log(`📁 Upload path: ${filePath}`)
        console.log(`👤 User ID: ${user.id}`)
        console.log(`🗂️ Bucket: documents`)

        // Upload to storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        console.log(`📤 Upload result for ${file.name}:`, { 
          uploadError, 
          uploadData,
          uploadedPath: uploadData?.path,
          fullPath: uploadData?.fullPath,
          errorCode: uploadError?.statusCode,
          errorMessage: uploadError?.message 
        })

        if (uploadError) {
          console.error(`❌ Storage upload failed for ${file.name}:`, uploadError)
          throw uploadError
        }

        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, progress: 75, status: 'processing' } : item
        ))

        // Insert metadata with appropriate status based on document type
        console.log(`💾 Inserting metadata for ${file.name}`)
        
        // Determine workflow based on document type
        const needsApproval = requiresApproval(selectedType)
        const needsReview = requiresReview(selectedType)
        
        let approvalStatus, reviewStatus, workflowStage, visibilityLevel
        let approvedBy = null, approvedAt = null, reviewedBy = null, reviewedAt = null
        
        if (needsApproval) {
          // Blocking approval required - restrict visibility until approved
          approvalStatus = 'pending'
          reviewStatus = null
          workflowStage = 'pending_approval'
          visibilityLevel = 'internal' // Always internal until approved
        } else if (needsReview) {
          // Non-blocking review - immediately available with selected visibility
          approvalStatus = 'available'
          reviewStatus = 'unreviewed'
          workflowStage = 'available'
          visibilityLevel = getVisibilityLevel(visibleToSuppliers, visibleToPolicyholders)
        } else {
          // No special handling needed - use selected visibility
          approvalStatus = 'available'
          reviewStatus = null
          workflowStage = 'available'
          visibilityLevel = getVisibilityLevel(visibleToSuppliers, visibleToPolicyholders)
          approvedBy = user.id
          approvedAt = new Date().toISOString()
        }
        
        console.log(`📋 Document workflow logic:`, {
          type: selectedType,
          needsApproval,
          needsReview,
          approvalStatus,
          reviewStatus,
          workflowStage
        })
        
        const { error: insertError, data: insertData } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            user_id: user.id,
            name: file.name,
            path: filePath,
            type: selectedType,
            note: note.trim() || null,
            file_size: file.size,
            approval_status: approvalStatus,
            review_status: reviewStatus,
            workflow_stage: workflowStage,
            visibility_level: visibilityLevel,
            approved_by: approvedBy,
            approved_at: approvedAt,
            reviewed_by: reviewedBy,
            reviewed_at: reviewedAt
          })

        console.log(`📄 Database insert result for ${file.name}:`, { 
          insertError, 
          insertData 
        })

        if (insertError) {
          console.error(`❌ Database insert failed for ${file.name}:`, insertError)
          throw insertError
        }

        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, progress: 100, status: 'complete' } : item
        ))

        successCount++
        console.log(`✅ Successfully uploaded: ${file.name}`)
        
      } catch (error: any) {
        console.error(`💥 Error uploading ${file.name}:`, {
          error,
          message: error.message,
          statusCode: error.statusCode,
          stack: error.stack
        })
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'error', error: error.message } : item
        ))
        errorCount++
      }
    }

    // Show completion toast
    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} file(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      })
    }

    // Cleanup and refresh
    setTimeout(() => {
      setUploadProgress([])
      setUploading(false)
      setNote('')
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowUploadSection(false) // Hide upload section after successful upload
      fetchDocuments()
    }, 2000)
  }

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc)
    
    // Extract filename without extension
    const lastDotIndex = doc.name.lastIndexOf('.')
    const nameWithoutExt = lastDotIndex !== -1 ? doc.name.substring(0, lastDotIndex) : doc.name
    
    setEditName(nameWithoutExt)
    setEditType(doc.type)
    setEditNote(doc.note || '')
    
    // Convert visibility level to toggle states
    const toggles = getVisibilityToggles(doc.visibility_level || 'internal')
    setEditVisibleToSuppliers(toggles.suppliers)
    setEditVisibleToPolicyholders(toggles.policyholders)
    
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingDoc || !editName.trim()) return

    try {
      // Extract original file extension
      const lastDotIndex = editingDoc.name.lastIndexOf('.')
      const fileExtension = lastDotIndex !== -1 ? editingDoc.name.substring(lastDotIndex) : ''
      
      // Reconstruct filename with extension
      const newFullName = editName.trim() + fileExtension

      const { error } = await supabase
        .from('documents')
        .update({
          name: newFullName,
          type: editType,
          note: editNote.trim() || null,
          visibility_level: getVisibilityLevel(editVisibleToSuppliers, editVisibleToPolicyholders)
        })
        .eq('id', editingDoc.id)

      if (error) throw error

      toast({
        title: "Document Updated",
        description: `Document has been updated successfully`,
      })

      setEditDialogOpen(false)
      setEditingDoc(null)
      setEditName('')
      setEditType('')
      setEditNote('')
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update document: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!isAdmin && doc.user_id !== user?.id) {
      toast({
        title: "Permission Denied",
        description: "You can only delete your own documents",
        variant: "destructive",
      })
      return
    }

    try {
      await supabase.from('documents').delete().eq('id', doc.id)
      await supabase.storage.from('documents').remove([doc.path])
      
      toast({
        title: "Document Deleted",
        description: `${doc.name} has been deleted`,
      })
      
      fetchDocuments()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const handleApprove = (doc: Document) => {
    console.log('handleApprove called with doc:', doc)
    console.log('Setting approval dialog open...')
    setApprovalDocument(doc)
    setApprovalDialogOpen(true)
    console.log('Approval dialog state set:', { approvalDocument: doc, approvalDialogOpen: true })
  }

  const handleReview = (doc: Document) => {
    console.log('handleReview called with doc:', doc)
    console.log('Setting review dialog open...')
    setReviewDocument(doc)
    setReviewDialogOpen(true)
    console.log('Review dialog state set:', { reviewDocument: doc, reviewDialogOpen: true })
  }

  const handleApproveDocument = async () => {
    if (!approvalDocument) return

    try {
      const requiredLevel = getRequiredApprovalLevel(approvalDocument.type)
      await approveDocument.mutateAsync({ 
        documentId: approvalDocument.id, 
        approvalLevel: requiredLevel,
        visibility: approvalDocument.visibility_level || 'internal'
      })
      
      toast({
        title: "Document Approved",
        description: `${approvalDocument.name} has been approved`,
      })
      
      setApprovalDialogOpen(false)
      setApprovalDocument(null)
      setApprovalComments('')
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to approve document: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleRejectDocument = async () => {
    if (!approvalDocument || !rejectionReason.trim()) return

    try {
      await rejectDocument.mutateAsync({ 
        documentId: approvalDocument.id, 
        reason: rejectionReason.trim()
      })
      
      toast({
        title: "Document Rejected",
        description: `${approvalDocument.name} has been rejected`,
      })
      
      setApprovalDialogOpen(false)
      setApprovalDocument(null)
      setRejectionReason('')
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to reject document: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleReviewDocument = async () => {
    if (!reviewDocument) return

    try {
      await reviewDocumentMutation.mutateAsync({ 
        documentId: reviewDocument.id, 
        comments: reviewComments.trim() || undefined
      })
      
      toast({
        title: "Document Reviewed",
        description: `${reviewDocument.name} has been marked as reviewed`,
      })
      
      setReviewDialogOpen(false)
      setReviewDocument(null)
      setReviewComments('')
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to review document: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      console.log('📥 Attempting download for:', {
        name: doc.name,
        path: doc.path,
        bucket: 'documents'
      })

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.path, 60 * 5)

      console.log('📥 Download signed URL result:', { data, error })

      if (error) {
        console.error('❌ Download signed URL error:', error)
        throw error
      }
      
      if (!data?.signedUrl) {
        throw new Error('No signed URL returned')
      }

      console.log('✅ Downloading file:', data.signedUrl)
      
      // Force download instead of opening in browser
      try {
        const response = await fetch(data.signedUrl)
        const blob = await response.blob()
        
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = doc.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Download Started",
          description: `${doc.name} is downloading to your Downloads folder`,
        })
      } catch (fetchError) {
        // Fallback to direct link if fetch fails
        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = doc.name
        link.target = '_blank'
        link.click()
      }
    } catch (error: any) {
      console.error('💥 Download error:', error)
      toast({
        title: "Download Error", 
        description: `Failed to download document: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Memoize filtered documents to prevent unnecessary re-renders when document type changes
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesType = filteredType === 'All' || doc.type === filteredType
      const matchesSearch = searchQuery === '' || 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.note?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Filter by active tab
      let matchesTab = true
      if (activeTab === 'pending') {
        matchesTab = doc.approval_status === 'pending'
      } else if (activeTab === 'review') {
        matchesTab = doc.review_status === 'unreviewed'
      }
      
      // Filter by date range
      let matchesDate = true
      if (dateRange.start || dateRange.end) {
        const docDate = new Date(doc.uploaded_at)
        if (dateRange.start && docDate < new Date(dateRange.start)) {
          matchesDate = false
        }
        if (dateRange.end && docDate > new Date(dateRange.end + 'T23:59:59')) {
          matchesDate = false
        }
      }
      
      // Filter by uploader
      let matchesUploader = uploaderFilter === 'all' || doc.user_id === uploaderFilter
      
      return matchesType && matchesSearch && matchesTab && matchesDate && matchesUploader
    })
  }, [documents, filteredType, searchQuery, activeTab, dateRange, uploaderFilter])

  // Document statistics
  const documentStats = useMemo(() => {
    const total = documents.length
    const pending = documents.filter(d => d.approval_status === 'pending').length
    const approved = documents.filter(d => d.approval_status === 'approved' || d.approval_status === 'available').length
    const rejected = documents.filter(d => d.approval_status === 'rejected').length
    const needsReview = documents.filter(d => d.review_status === 'unreviewed').length
    
    return { total, pending, approved, rejected, needsReview }
  }, [documents])

  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
  const isPdf = (filename: string) => /\.pdf$/i.test(filename)
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getVisibilityInfo = (level: string) => {
    return visibilityOptions.find(opt => opt.value === level) || visibilityOptions[0]
  }

  // Convert toggle states to visibility level
  const getVisibilityLevel = (suppliers: boolean, policyholders: boolean) => {
    if (suppliers && policyholders) return 'public'
    if (policyholders) return 'customers'
    if (suppliers) return 'contractors'
    return 'internal'
  }

  // Convert visibility level to toggle states
  const getVisibilityToggles = (level: string) => {
    switch (level) {
      case 'public': return { suppliers: true, policyholders: true }
      case 'customers': return { suppliers: false, policyholders: true }
      case 'contractors': return { suppliers: true, policyholders: false }
      default: return { suppliers: false, policyholders: false }
    }
  }

  const getFileIcon = (filename: string) => {
    if (isImage(filename)) return <ImageIcon className="w-4 h-4" />
    if (isPdf(filename)) return <FileText className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  // Memoize DocumentImage component to prevent thumbnail refreshes
  const DocumentImage = useCallback(({ doc, onClick }: { doc: Document, onClick: () => void }) => {
    const [imageSrc, setImageSrc] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const getImageUrl = async () => {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.path, 60 * 60)

          if (error) throw error
          if (!data?.signedUrl) throw new Error('No signed URL returned')
          
          setImageSrc(data.signedUrl)
        } catch (error: any) {
          setImageSrc('')
        } finally {
          setLoading(false)
        }
      }

      if (isImage(doc.name)) {
        getImageUrl()
      } else {
        setLoading(false)
      }
    }, [doc.path, doc.name]) // Only depend on path and name, not doc object

    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/70">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!imageSrc) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/70">
          <div className="p-3 bg-background/80 rounded-full mb-2 shadow-sm">
            {getFileIcon(doc.name)}
          </div>
          <span className="text-xs font-medium">{doc.type}</span>
        </div>
      )
    }

    return (
      <img
        src={imageSrc}
        alt={doc.name}
        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
        onClick={onClick}
        onError={() => setImageSrc('')}
      />
    )
  }, []) // Empty dependency array since we're only using doc.path and doc.name in useEffect

  // Component for preview modal images
  const PreviewImage = ({ doc }: { doc: Document }) => {
    const [imageSrc, setImageSrc] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const getImageUrl = async () => {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.path, 60 * 60)

          if (error) throw error
          setImageSrc(data.signedUrl)
        } catch (error) {
          console.error('Error getting signed URL for preview:', error)
        } finally {
          setLoading(false)
        }
      }

      getImageUrl()
    }, [doc.path])

    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )
    }

    return imageSrc ? (
      <img src={imageSrc} alt={doc.name} className="w-full h-auto" />
    ) : (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Failed to load image
      </div>
    )
  }

  const DocumentCard = ({ doc }: { doc: Document }) => {
    // Add defensive checks
    if (!doc) {
      console.warn('DocumentCard received null/undefined document')
      return null
    }

    if (!doc.name || !doc.type || !doc.uploaded_at) {
      console.warn('DocumentCard received incomplete document:', doc)
      return null
    }

    const isSelected = selectedDocuments.has(doc.id)

    return (
      <Card 
        className={cn(
          "group hover:shadow-lg transition-all duration-200 border-0 shadow-sm hover:scale-[1.02]",
          isSelected && "ring-2 ring-primary bg-primary/5",
          isMultiSelectMode && "cursor-pointer"
        )}
        onClick={(e) => handleDocumentClick(doc, e)}
      >
        <CardContent className="p-4 h-full flex flex-col">
        {/* Preview */}
        <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted rounded-xl mb-3 overflow-hidden relative shadow-inner">
          {isImage(doc.name) ? (
            <DocumentImage doc={doc} onClick={() => {
              setSelectedDocument(doc)
              setPreviewOpen(true)
            }} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/70">
              <div className="p-3 bg-background/80 rounded-full mb-2 shadow-sm">
                {getFileIcon(doc.name)}
              </div>
              <span className="text-xs font-medium">{doc.type}</span>
            </div>
          )}
          
          {/* Enhanced overlay actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-center pb-4">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleDownload(doc)} className="shadow-lg">
                <Download className="w-4 h-4" />
              </Button>
              {isImage(doc.name) && (
                <Button size="sm" variant="secondary" onClick={() => {
                  setSelectedDocument(doc)
                  setPreviewOpen(true)
                }} className="shadow-lg">
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <div className="absolute top-2 left-2 z-10">
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-white/90 border-gray-400"
              )}>
                {isSelected && <CheckCircle className="w-3 h-3" />}
              </div>
            </div>
          )}

          {/* File type and status indicators */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Badge variant="secondary" className="text-xs shadow-sm">
              {doc.type}
            </Badge>
            
            {/* Visibility indicator */}
            {doc.visibility_level && doc.visibility_level !== 'internal' && (
              <Badge 
                variant="outline" 
                className={cn("text-xs shadow-sm bg-white/90", getVisibilityInfo(doc.visibility_level).color)}
              >
                <span className="mr-1">{getVisibilityInfo(doc.visibility_level).icon}</span>
                {getVisibilityInfo(doc.visibility_level).label.split(' ')[0]}
              </Badge>
            )}
            
            {/* Only show status badges that require action or are important */}
            {doc.approval_status === 'pending' && (
              <Badge 
                className={cn("text-xs shadow-sm text-white", getApprovalStatusColor(doc.approval_status))}
              >
                {getApprovalStatusLabel(doc.approval_status)}
              </Badge>
            )}
            {doc.approval_status === 'rejected' && (
              <Badge 
                className={cn("text-xs shadow-sm text-white", getApprovalStatusColor(doc.approval_status))}
              >
                {getApprovalStatusLabel(doc.approval_status)}
              </Badge>
            )}
            {doc.review_status === 'unreviewed' && requiresReview(doc.type) && (
              <Badge 
                className={cn("text-xs shadow-sm text-white", getReviewStatusColor(doc.review_status))}
              >
                {getReviewStatusLabel(doc.review_status)}
              </Badge>
            )}
          </div>
        </div>

        {/* Document info */}
        <div className="space-y-2 flex-1 flex flex-col">
          <h4 className="font-medium text-sm truncate" title={doc.name}>
            {doc.name}
          </h4>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {doc.type || 'Unknown'}
            </Badge>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span title={doc.uploaded_at ? format(new Date(doc.uploaded_at), 'PPpp') : 'Unknown date'}>
              {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
            </span>
          </div>

          {doc.uploaded_by && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {doc.uploaded_by.preferred_name || 
               (doc.uploaded_by.first_name && doc.uploaded_by.surname ? 
                `${doc.uploaded_by.first_name} ${doc.uploaded_by.surname}` : 
                doc.uploaded_by.email)}
            </div>
          )}

          {doc.approved_by_user && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>Approved by {doc.approved_by_user.first_name} {doc.approved_by_user.surname}</span>
            </div>
          )}

          {doc.workflow_stage && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span className="capitalize">{doc.workflow_stage.replace('_', ' ')}</span>
            </div>
          )}

          {doc.visibility_level && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{getVisibilityInfo(doc.visibility_level).icon}</span>
              <span>{getVisibilityInfo(doc.visibility_level).label}</span>
            </div>
          )}

          {/* Fixed height container for notes to maintain card alignment */}
          <div className="h-8 flex items-start">
            {doc.note && (
              <p className="text-xs text-muted-foreground italic line-clamp-2" title={doc.note}>
                {doc.note}
              </p>
            )}
          </div>
        </div>

        {/* Enhanced Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          {/* Show action buttons based on document type and status */}
          {isAdmin && doc.approval_status === 'pending' && requiresApproval(doc.type) ? (
            <Button 
              size="sm" 
              onClick={() => {
                console.log('Direct approve button clicked for doc:', doc.id)
                handleApprove(doc)
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white transition-colors"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve Required
            </Button>
          ) : isAdmin && doc.review_status === 'unreviewed' && requiresReview(doc.type) ? (
            <Button 
              size="sm" 
              onClick={() => {
                console.log('Direct review button clicked for doc:', doc.id)
                handleReview(doc)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleDownload(doc)} className="hover:bg-primary hover:text-primary-foreground transition-colors">
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="shadow-lg">
              {isImage(doc.name) && (
                <DropdownMenuItem onClick={() => {
                  setSelectedDocument(doc)
                  setPreviewOpen(true)
                }} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleDownload(doc)} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              
              {/* Approval actions for authorized users */}
              {console.log('Approval Debug:', { 
                isAdmin, 
                docStatus: doc.approval_status, 
                showApproval: isAdmin && doc.approval_status === 'pending',
                userRole: user?.role
              })}
              {/* Approval options for documents that require approval */}
              {isAdmin && doc.approval_status === 'pending' && requiresApproval(doc.type) && (
                <DropdownMenuItem onClick={() => {
                  console.log('Approve clicked for doc:', doc.id)
                  handleApprove(doc)
                }} className="cursor-pointer text-orange-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Document
                </DropdownMenuItem>
              )}
              
              {/* Review options for documents that need review */}
              {isAdmin && doc.review_status === 'unreviewed' && requiresReview(doc.type) && (
                <DropdownMenuItem onClick={() => {
                  console.log('Review clicked for doc:', doc.id)
                  handleReview(doc)
                }} className="cursor-pointer text-blue-600">
                  <Eye className="w-4 h-4 mr-2" />
                  Mark as Reviewed
                </DropdownMenuItem>
              )}
              
              {(isAdmin || doc.user_id === user?.id) && (
                <>
                  <DropdownMenuItem onClick={() => handleEdit(doc)} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(doc)}
                    className="text-destructive cursor-pointer hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Project Documents
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage, review and approve project documentation
            </p>
          </div>
          
          {/* Document Stats Cards */}
          <div className="flex gap-3">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
              <div className="text-2xl font-bold">{documentStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Files</div>
            </div>
            {documentStats.pending > 0 && (
              <div className="bg-orange-50 rounded-lg px-4 py-2 shadow-sm border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{documentStats.pending}</div>
                <div className="text-xs text-orange-700">Awaiting Approval</div>
              </div>
            )}
            {documentStats.needsReview > 0 && (
              <div className="bg-blue-50 rounded-lg px-4 py-2 shadow-sm border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{documentStats.needsReview}</div>
                <div className="text-xs text-blue-700">Need Review</div>
              </div>
            )}
            {documentStats.rejected > 0 && (
              <div className="bg-red-50 rounded-lg px-4 py-2 shadow-sm border border-red-200">
                <div className="text-2xl font-bold text-red-600">{documentStats.rejected}</div>
                <div className="text-xs text-red-700">Rejected</div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Workflow Tabs & Actions */}
      <div className="bg-white rounded-lg border p-2">
        <div className="flex items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1">
            <TabsList className="h-10 bg-slate-50">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                All Documents
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {documentStats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                Awaiting Approval
                {documentStats.pending > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 bg-orange-500">
                    {documentStats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="review" className="data-[state=active]:bg-white">
                <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                Need Review
                {documentStats.needsReview > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 bg-blue-500">
                    {documentStats.needsReview}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {/* Upload Toggle Button */}
            <Button
              variant={showUploadSection ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUploadSection(!showUploadSection)}
              className="h-10 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Upload
              <ChevronDown className={cn(
                "w-3.5 h-3.5 ml-1.5 transition-transform",
                showUploadSection && "rotate-180"
              )} />
            </Button>
            
            {!isMultiSelectMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="h-10"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Select All
              </Button>
            )}
            <Button
              variant={isMultiSelectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => isMultiSelectMode ? exitMultiSelectMode() : setIsMultiSelectMode(true)}
              className="h-10"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {isMultiSelectMode ? 'Exit' : 'Multi-Select'}
            </Button>
            <div className="flex gap-1 border-l pl-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-10 w-10 p-0"
              >
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-10 w-10 p-0"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Upload Dropdown - appears right below tabs */}
        {showUploadSection && (
          <div className="mt-2 p-4 bg-white rounded-lg shadow-lg border animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900">Upload New Documents</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadSection(false)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {/* Main Form Row */}
              <div className="grid grid-cols-12 gap-4 items-end">
                {/* File Selection - 4 cols (shorter) */}
                <div className="col-span-4">
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Files</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-gray-200 rounded-lg px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer h-[42px] flex items-center">
                      <div className="flex items-center gap-2 w-full">
                        <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {selectedFiles.length > 0 
                              ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` 
                              : 'Choose files'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Type - 3 cols */}
                <div className="col-span-3">
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-[42px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.slice(1).map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility Options - 5 cols */}
                <div className="col-span-5">
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Share with</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={visibleToSuppliers ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVisibleToSuppliers(!visibleToSuppliers)}
                      className="flex-1 h-[42px] text-xs"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Suppliers
                    </Button>
                    <Button
                      type="button"
                      variant={visibleToPolicyholders ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVisibleToPolicyholders(!visibleToPolicyholders)}
                      className="flex-1 h-[42px] text-xs"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Policyholders
                    </Button>
                  </div>
                </div>
              </div>

              {/* Second Row: Notes and Upload */}
              <div className="grid grid-cols-12 gap-4 items-end">
                {/* Notes - 8 cols */}
                <div className="col-span-8">
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes (optional)</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add notes about these documents..."
                    className="h-[42px]"
                  />
                </div>

                {/* Upload Button - 4 cols (plenty of space) */}
                <div className="col-span-4">
                  <Label className="text-xs font-medium text-transparent mb-1.5 block">Action</Label>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || selectedFiles.length === 0}
                    className="h-[42px] w-full px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload Documents</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Selected Files Preview - Compact */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">Selected Files</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                    className="h-6 text-xs px-2"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded border text-xs">
                      {getFileIcon(file.name)}
                      <span className="max-w-[120px] truncate" title={file.name}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-1 hover:text-red-600 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress - Inline */}
            {uploadProgress.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadProgress.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate">{item.filename}</span>
                        <span className="text-muted-foreground">
                          {item.status === 'complete' ? '✓' : 
                           item.status === 'error' ? '✗' : `${item.progress}%`}
                        </span>
                      </div>
                      <Progress 
                        value={item.progress} 
                        className={`h-1 ${item.status === 'error' ? 'bg-red-100' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters Bar - Streamlined */}
      <div className="bg-white rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Type Filter */}
          <Select value={filteredType} onValueChange={setFilteredType}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <Filter className="w-3 h-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Uploader Filter */}
          <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <User className="w-3 h-3 mr-1.5" />
              <SelectValue placeholder="All uploaders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Uploaders</SelectItem>
              {uploaders.map((uploader) => (
                <SelectItem key={uploader.id} value={uploader.id}>{uploader.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Date:</Label>
            <div className="relative">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="h-8 text-sm w-36 pr-8"
              />
            </div>
            <span className="text-xs text-muted-foreground">to</span>
            <div className="relative">
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="h-8 text-sm w-36 pr-8"
              />
            </div>
            {(dateRange.start || dateRange.end) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDateRange({ start: '', end: '' })}
                className="h-8 px-2"
                title="Clear dates"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar - Compact */}
      {isMultiSelectMode && selectedDocuments.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600">{selectedDocuments.size} selected</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleSelectAll}
                className="h-7 text-xs"
              >
                {selectedDocuments.size === filteredDocuments.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkDownload}
                className="h-7 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
              {isAdmin && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBulkReview}
                    className="h-7 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Review
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleBulkDelete}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exitMultiSelectMode}
                className="h-7 w-7 p-0"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || filteredType !== 'All' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first document to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
        }>
          {filteredDocuments.map((doc, index) => {
            // Debug log for first few documents
            if (index < 3) {
              console.log(`📄 Document ${index}:`, {
                id: doc.id,
                name: doc.name,
                type: doc.type,
                uploaded_at: doc.uploaded_at,
                hasRequiredFields: !!(doc.id && doc.name && doc.type && doc.uploaded_at)
              })
            }
            
            const isSelected = selectedDocuments.has(doc.id)
            
            return viewMode === 'grid' ? (
              <DocumentCard key={doc.id || index} doc={doc} />
            ) : (
              <Popover key={doc.id || index} open={hoveredDocument?.id === doc.id}>
                <PopoverTrigger asChild>
                  <Card 
                    className={cn(
                      "hover:shadow-sm transition-all cursor-pointer",
                      isSelected && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={(e) => handleDocumentClick(doc, e)}
                    onMouseEnter={() => handleMouseEnter(doc)}
                    onMouseLeave={handleMouseLeave}
                  >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Multi-select checkbox */}
                    {isMultiSelectMode && (
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-gray-400"
                        )}>
                          {isSelected && <CheckCircle className="w-3 h-3" />}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-shrink-0">
                      {getFileIcon(doc.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{doc.name}</h4>
                        {/* Status badges */}
                        {doc.approval_status === 'pending' && (
                          <Badge className={cn("text-xs", getApprovalStatusColor(doc.approval_status))}>
                            {getApprovalStatusLabel(doc.approval_status)}
                          </Badge>
                        )}
                        {doc.approval_status === 'rejected' && (
                          <Badge className={cn("text-xs", getApprovalStatusColor(doc.approval_status))}>
                            {getApprovalStatusLabel(doc.approval_status)}
                          </Badge>
                        )}
                        {doc.review_status === 'unreviewed' && requiresReview(doc.type) && (
                          <Badge className={cn("text-xs", getReviewStatusColor(doc.review_status))}>
                            {getReviewStatusLabel(doc.review_status)}
                          </Badge>
                        )}
                        {/* Visibility indicator for list view */}
                        {doc.visibility_level && doc.visibility_level !== 'internal' && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getVisibilityInfo(doc.visibility_level).color)}
                          >
                            <span className="mr-1">{getVisibilityInfo(doc.visibility_level).icon}</span>
                            {getVisibilityInfo(doc.visibility_level).label.split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{doc.type}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span title={doc.uploaded_at ? format(new Date(doc.uploaded_at), 'PPpp') : 'Unknown date'}>
                          {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
                        </span>
                      </div>
                      {doc.note && (
                        <p className="text-xs text-muted-foreground italic mt-1">{doc.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Priority action buttons for workflow */}
                      {isAdmin && doc.approval_status === 'pending' && requiresApproval(doc.type) ? (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(doc)
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                      ) : isAdmin && doc.review_status === 'unreviewed' && requiresReview(doc.type) ? (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReview(doc)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(doc)
                        }}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {(isAdmin || doc.user_id === user?.id) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(doc)
                          }}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(doc)
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
                  </Card>
                </PopoverTrigger>
                <PopoverContent 
                  side="right" 
                  align="start" 
                  className="p-0 w-auto border-0 shadow-lg"
                >
                  <QuickPreview doc={doc} />
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      )}


      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
            <DialogDescription>
              {selectedDocument?.type} • {formatFileSize(selectedDocument?.file_size)}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && isImage(selectedDocument.name) && (
            <div className="flex-1 overflow-auto">
              <PreviewImage doc={selectedDocument} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
            <DialogDescription>
              Update the document name, type, and notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter document name..."
                  className="flex-1"
                />
                {editingDoc && (
                  <Badge variant="secondary" className="text-xs">
                    {editingDoc.name.substring(editingDoc.name.lastIndexOf('.')) || ''}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                File extension will be preserved automatically
              </p>
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.slice(1).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-visible-suppliers"
                    checked={editVisibleToSuppliers}
                    onChange={(e) => setEditVisibleToSuppliers(e.target.checked)}
                    className="rounded border border-input"
                  />
                  <Label htmlFor="edit-visible-suppliers" className="text-sm font-normal cursor-pointer">
                    Make visible to suppliers/contractors
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-visible-policyholders"
                    checked={editVisibleToPolicyholders}
                    onChange={(e) => setEditVisibleToPolicyholders(e.target.checked)}
                    className="rounded border border-input"
                  />
                  <Label htmlFor="edit-visible-policyholders" className="text-sm font-normal cursor-pointer">
                    Make visible to policyholders/customers
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Internal staff can always access documents
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Add any notes about this document..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Approval Dialog */}
      {console.log('Dialog render:', { approvalDialogOpen, hasApprovalDocument: !!approvalDocument })}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <DialogDescription>
              Review and approve or reject this document
            </DialogDescription>
          </DialogHeader>
          
          {approvalDocument && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 bg-muted/50">
                <h4 className="font-medium">{approvalDocument.name}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>{approvalDocument.type}</span>
                  <span>{formatFileSize(approvalDocument.file_size)}</span>
                </div>
                <div className="mt-2">
                  <Badge className={cn("text-xs", getApprovalStatusColor(approvalDocument.approval_status || 'pending'))}>
                    {getApprovalStatusLabel(approvalDocument.approval_status || 'pending')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Approval Comments (Optional)</Label>
                <Textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Add any comments about this approval..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setApprovalDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleRejectDocument}
                  disabled={!rejectionReason.trim() || rejectDocument.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={handleApproveDocument}
                  disabled={approveDocument.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Mark this document as reviewed and add any comments
            </DialogDescription>
          </DialogHeader>
          
          {reviewDocument && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 bg-muted/50">
                <h4 className="font-medium">{reviewDocument.name}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>{reviewDocument.type}</span>
                  <span>{formatFileSize(reviewDocument.file_size)}</span>
                </div>
                <div className="mt-2">
                  <Badge className={cn("text-xs", getReviewStatusColor(reviewDocument.review_status || 'unreviewed'))}>
                    {getReviewStatusLabel(reviewDocument.review_status || 'unreviewed')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Review Comments (Optional)</Label>
                <Textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Add any comments or observations about this document..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Note: This document is already available to the team. This review is for quality control and audit purposes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setReviewDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReviewDocument}
                  disabled={reviewDocumentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Reviewed
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}