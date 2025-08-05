'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/hooks/useUser'
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
  Edit
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
  uploaded_by?: {
    email: string
    full_name?: string
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      console.log('👤 Current user:', { userId: user?.id, userError })
      
      if (!user) {
        console.error('❌ No authenticated user found')
        toast({
          title: "Authentication Error",
          description: "Please log in to view documents",
          variant: "destructive",
        })
        return
      }
      
      // Try with join first
      console.log('🔍 Attempting query with user_profiles join...')
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          uploaded_by:user_profiles(email, full_name)
        `)
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      console.log('📄 Query result:', { 
        dataCount: data?.length, 
        error,
        errorCode: error?.code,
        errorMessage: error?.message 
      })

      if (error) {
        console.error('❌ Join query failed, trying simple query:', error)
        
        // Fallback to simple query without join
        const { data: simpleData, error: simpleError } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false })
        
        if (simpleError) {
          throw simpleError
        }
        
        console.log('✅ Fallback query successful:', simpleData?.length || 0)
        setDocuments(simpleData || [])
        
        toast({
          title: "Partial Success",
          description: "Documents loaded, but user info unavailable",
          variant: "default",
        })
        return
      }

      console.log('✅ Successfully fetched documents with user info:', data?.length || 0)
      setDocuments(data || [])
      
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
      
      return matchesType && matchesSearch
    })
  }, [documents, filteredType, searchQuery])

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

  const DocumentCard = ({ doc }: { doc: Document }) => (
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
          
          {/* File type indicator */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs shadow-sm">
              {doc.type}
            </Badge>
          </div>
        </div>

        {/* Document info */}
        <div className="space-y-2 flex-1 flex flex-col">
          <h4 className="font-medium text-sm truncate" title={doc.name}>
            {doc.name}
          </h4>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {doc.type}
            </Badge>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span title={format(new Date(doc.uploaded_at), 'PPpp')}>
              {format(new Date(doc.uploaded_at), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>

          {doc.uploaded_by && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {doc.uploaded_by.full_name || doc.uploaded_by.email}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Documents</h2>
          <p className="text-muted-foreground">
            Upload and manage documents for this project
          </p>
        </div>
        <Badge variant="outline">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </Badge>
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
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
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
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Files'}
              </Button>
            </div>
          </div>

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
          {filteredDocuments.map((doc) => (
            viewMode === 'grid' ? (
              <DocumentCard key={doc.id} doc={doc} />
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
                        <span title={format(new Date(doc.uploaded_at), 'PPpp')}>
                          {format(new Date(doc.uploaded_at), 'MMM d, yyyy • h:mm a')}
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
          ))}
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
    </div>
  )
}