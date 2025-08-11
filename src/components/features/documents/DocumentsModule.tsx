'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
import { 
  useDocumentApprovals, 
  useApprovalMutations,
  getApprovalStatusColor,
  getApprovalStatusLabel,
  getRequiredApprovalLevel
} from '@/hooks/useDocumentApprovals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  MessageSquare
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

export default function DocumentsModule({ projectId }: { projectId: string }) {
  const { user, isAdmin } = useUser()
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredType, setFilteredType] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('Report')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [note, setNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [approvalDocument, setApprovalDocument] = useState<Document | null>(null)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved'>('all')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Approval mutations
  const { approveDocument, rejectDocument } = useApprovalMutations()

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

        // Insert metadata
        console.log(`💾 Inserting metadata for ${file.name}`)
        const { error: insertError, data: insertData } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            user_id: user.id,
            name: file.name,
            path: filePath,
            type: selectedType,
            note: note.trim() || null,
            file_size: file.size
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
      fetchDocuments()
    }, 2000)
  }

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc)
    setEditName(doc.name)
    setEditType(doc.type)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingDoc || !editName.trim()) return

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          name: editName.trim(),
          type: editType
        })
        .eq('id', editingDoc.id)

      if (error) throw error

      toast({
        title: "Document Updated",
        description: `${editingDoc.name} has been updated`,
      })

      setEditDialogOpen(false)
      setEditingDoc(null)
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
    setApprovalDocument(doc)
    setApprovalDialogOpen(true)
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
      } else if (activeTab === 'approved') {
        matchesTab = doc.approval_status === 'approved'
      }
      
      return matchesType && matchesSearch && matchesTab
    })
  }, [documents, filteredType, searchQuery, activeTab])

  // Document statistics
  const documentStats = useMemo(() => {
    const total = documents.length
    const pending = documents.filter(d => d.approval_status === 'pending').length
    const approved = documents.filter(d => d.approval_status === 'approved').length
    const rejected = documents.filter(d => d.approval_status === 'rejected').length
    
    return { total, pending, approved, rejected }
  }, [documents])

  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
  const isPdf = (filename: string) => /\.pdf$/i.test(filename)
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
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

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm hover:scale-[1.02]">
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
          
          {/* File type and approval status indicators */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Badge variant="secondary" className="text-xs shadow-sm">
              {doc.type}
            </Badge>
            {doc.approval_status && (
              <Badge 
                className={cn("text-xs shadow-sm text-white", getApprovalStatusColor(doc.approval_status))}
              >
                {getApprovalStatusLabel(doc.approval_status)}
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
          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)} className="hover:bg-primary hover:text-primary-foreground transition-colors">
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>

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
              {isAdmin && doc.approval_status === 'pending' && (
                <>
                  <DropdownMenuItem onClick={() => handleApprove(doc)} className="cursor-pointer text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Review/Approve
                  </DropdownMenuItem>
                </>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Documents</h2>
          <p className="text-muted-foreground">
            Upload and manage documents with approval workflows
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{documentStats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">{documentStats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{documentStats.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{documentStats.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload multiple files at once. Supported formats: Images, PDFs, Word, Excel, Text files (Max 50MB each)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Document Type */}
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
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

            {/* File Selection */}
            <div className="space-y-2">
              <Label>Select Files</Label>
              <div className="relative">
                <Input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` : 'Choose Files'}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add notes for all files..."
                className="min-h-[40px]"
              />
            </div>

            {/* Upload Button */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Files'}
              </Button>
            </div>
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 h-6 w-6 p-0"
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              {uploadProgress.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{item.filename}</span>
                    <span className="text-muted-foreground">
                      {item.status === 'complete' ? 'Complete' : 
                       item.status === 'error' ? 'Error' : `${item.progress}%`}
                    </span>
                  </div>
                  <Progress 
                    value={item.progress} 
                    className={`h-2 ${item.status === 'error' ? 'bg-red-100' : ''}`}
                  />
                  {item.error && (
                    <p className="text-xs text-red-600">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Documents ({documentStats.total})</TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pending Approval ({documentStats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved ({documentStats.approved})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <Select value={filteredType} onValueChange={setFilteredType}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
            
            return viewMode === 'grid' ? (
              <DocumentCard key={doc.id || index} doc={doc} />
            ) : (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(doc.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{doc.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{doc.type}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span title={doc.uploaded_at ? format(new Date(doc.uploaded_at), 'PPpp') : 'Unknown date'}>
                          {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      {(isAdmin || doc.user_id === user?.id) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(doc)}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              Update the name and type for this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter document name..."
              />
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
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
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
    </div>
  )
}