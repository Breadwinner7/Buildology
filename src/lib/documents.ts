import { supabase } from './supabaseClient'

// Enhanced document types for UK insurance industry
export interface DocumentType {
  id: string
  name: string
  display_name: string
  category: 'photos' | 'reports' | 'forms' | 'certificates' | 'contracts' | 'correspondence' | 'legal' | 'other'
  required_roles: string[]
  max_file_size: number // in bytes
  allowed_extensions: string[]
  requires_approval: boolean
  retention_years: number
  is_sensitive: boolean
  description: string
  template_path?: string
}

export interface DocumentUpload {
  file: File
  type: string
  description?: string
  is_sensitive?: boolean
  requires_approval?: boolean
}

// UK Insurance document types
export const UK_DOCUMENT_TYPES: DocumentType[] = [
  // Photos & Visual Evidence
  {
    id: 'damage_photos',
    name: 'damage_photos',
    display_name: 'Damage Photos',
    category: 'photos',
    required_roles: ['claims_handler', 'loss_adjuster', 'surveyor', 'contractor'],
    max_file_size: 50 * 1024 * 1024, // 50MB
    allowed_extensions: ['.jpg', '.jpeg', '.png', '.heic', '.raw'],
    requires_approval: false,
    retention_years: 7,
    is_sensitive: false,
    description: 'Visual evidence of property damage'
  },
  {
    id: 'site_photos',
    name: 'site_photos', 
    display_name: 'Site Photos',
    category: 'photos',
    required_roles: ['surveyor', 'contractor', 'loss_adjuster'],
    max_file_size: 50 * 1024 * 1024,
    allowed_extensions: ['.jpg', '.jpeg', '.png', '.heic'],
    requires_approval: false,
    retention_years: 7,
    is_sensitive: false,
    description: 'General site and property photographs'
  },

  // Professional Reports
  {
    id: 'survey_report',
    name: 'survey_report',
    display_name: 'Survey Report',
    category: 'reports',
    required_roles: ['chartered_surveyor', 'building_surveyor'],
    max_file_size: 25 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx'],
    requires_approval: true,
    retention_years: 15,
    is_sensitive: false,
    description: 'Professional building survey reports'
  },
  {
    id: 'structural_report',
    name: 'structural_report',
    display_name: 'Structural Engineer Report',
    category: 'reports', 
    required_roles: ['structural_engineer'],
    max_file_size: 25 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx', '.dwg'],
    requires_approval: true,
    retention_years: 15,
    is_sensitive: false,
    description: 'Structural engineering assessments and reports'
  },
  {
    id: 'loss_adjuster_report',
    name: 'loss_adjuster_report',
    display_name: 'Loss Adjuster Report',
    category: 'reports',
    required_roles: ['loss_adjuster'],
    max_file_size: 25 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx'],
    requires_approval: true,
    retention_years: 15,
    is_sensitive: true,
    description: 'Independent loss adjuster assessments'
  },

  // Certificates & Compliance
  {
    id: 'gas_safety_certificate',
    name: 'gas_safety_certificate',
    display_name: 'Gas Safety Certificate',
    category: 'certificates',
    required_roles: ['gas_engineer', 'contractor'],
    max_file_size: 10 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.jpg', '.png'],
    requires_approval: true,
    retention_years: 10,
    is_sensitive: false,
    description: 'Gas safety certificates and compliance documents'
  },
  {
    id: 'electrical_certificate',
    name: 'electrical_certificate', 
    display_name: 'Electrical Safety Certificate',
    category: 'certificates',
    required_roles: ['electrician', 'contractor'],
    max_file_size: 10 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.jpg', '.png'],
    requires_approval: true,
    retention_years: 10,
    is_sensitive: false,
    description: 'Electrical safety certificates and test results'
  },

  // Contracts & Legal
  {
    id: 'contractor_quote',
    name: 'contractor_quote',
    display_name: 'Contractor Quote',
    category: 'contracts',
    required_roles: ['contractor', 'claims_handler'],
    max_file_size: 15 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    requires_approval: false,
    retention_years: 7,
    is_sensitive: false,
    description: 'Contractor quotes and estimates'
  },
  {
    id: 'work_contract',
    name: 'work_contract',
    display_name: 'Work Contract',
    category: 'contracts',
    required_roles: ['claims_manager', 'senior_claims_handler'],
    max_file_size: 15 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx'],
    requires_approval: true,
    retention_years: 15,
    is_sensitive: true,
    description: 'Signed work contracts and agreements'
  },

  // Correspondence
  {
    id: 'policyholder_correspondence',
    name: 'policyholder_correspondence',
    display_name: 'Policyholder Correspondence',
    category: 'correspondence',
    required_roles: ['claims_handler', 'customer_service'],
    max_file_size: 10 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx', '.msg', '.eml'],
    requires_approval: false,
    retention_years: 7,
    is_sensitive: true,
    description: 'Communications with policyholders'
  },

  // Forms & Applications
  {
    id: 'claim_form',
    name: 'claim_form',
    display_name: 'Claim Form',
    category: 'forms',
    required_roles: ['claims_handler', 'policyholder'],
    max_file_size: 10 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx'],
    requires_approval: false,
    retention_years: 15,
    is_sensitive: true,
    description: 'Completed claim forms and applications'
  },

  // General documents
  {
    id: 'other',
    name: 'other',
    display_name: 'Other Document',
    category: 'other',
    required_roles: ['*'], // Anyone can upload
    max_file_size: 25 * 1024 * 1024,
    allowed_extensions: ['.pdf', '.doc', '.docx', '.jpg', '.png', '.xls', '.xlsx'],
    requires_approval: false,
    retention_years: 7,
    is_sensitive: false,
    description: 'Other project-related documents'
  }
]

// Fetch allowed document types based on user role
export const fetchAllowedDocumentTypes = async (userRole?: string): Promise<DocumentType[]> => {
  if (!userRole) return UK_DOCUMENT_TYPES.filter(type => type.required_roles.includes('*'))
  
  return UK_DOCUMENT_TYPES.filter(type => 
    type.required_roles.includes('*') || 
    type.required_roles.includes(userRole) ||
    userRole === 'super_admin'
  )
}

// Smart document type suggestion based on filename
export const suggestDocumentType = async (filename: string): Promise<{ type: string; confidence?: number }[]> => {
  const suggestions: { type: string; confidence: number }[] = []
  const lowerFilename = filename.toLowerCase()
  
  // Pattern matching for document types
  const patterns = [
    { types: ['damage_photos'], patterns: ['damage', 'broken', 'crack', 'leak', 'fire', 'flood', 'before', 'after'], confidence: 0.9 },
    { types: ['site_photos'], patterns: ['site', 'property', 'room', 'kitchen', 'bathroom', 'bedroom'], confidence: 0.8 },
    { types: ['survey_report'], patterns: ['survey', 'building_survey', 'condition', 'structural'], confidence: 0.9 },
    { types: ['contractor_quote'], patterns: ['quote', 'estimate', 'price', 'cost', 'tender'], confidence: 0.8 },
    { types: ['gas_safety_certificate'], patterns: ['gas', 'safety', 'certificate', 'cp12'], confidence: 0.95 },
    { types: ['electrical_certificate'], patterns: ['electrical', 'eicr', 'pat', 'test'], confidence: 0.95 },
    { types: ['claim_form'], patterns: ['claim', 'form', 'application'], confidence: 0.9 }
  ]
  
  // Check file extension for photo types
  if (['.jpg', '.jpeg', '.png', '.heic'].some(ext => lowerFilename.endsWith(ext))) {
    suggestions.push({ type: 'damage_photos', confidence: 0.6 })
    suggestions.push({ type: 'site_photos', confidence: 0.5 })
  }
  
  // Pattern matching
  patterns.forEach(({ types, patterns: searchPatterns, confidence }) => {
    const matchCount = searchPatterns.filter(pattern => lowerFilename.includes(pattern)).length
    if (matchCount > 0) {
      types.forEach(type => {
        suggestions.push({ 
          type, 
          confidence: confidence * (matchCount / searchPatterns.length) 
        })
      })
    }
  })
  
  // Sort by confidence and remove duplicates
  const uniqueSuggestions = suggestions
    .reduce((acc, curr) => {
      const existing = acc.find(s => s.type === curr.type)
      if (!existing || existing.confidence < curr.confidence) {
        return acc.filter(s => s.type !== curr.type).concat(curr)
      }
      return acc
    }, [] as { type: string; confidence: number }[])
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3) // Top 3 suggestions
  
  // Always include 'other' as fallback
  if (!uniqueSuggestions.find(s => s.type === 'other')) {
    uniqueSuggestions.push({ type: 'other', confidence: 0.1 })
  }
  
  return uniqueSuggestions
}

// Upload document to Supabase storage
export const uploadDocument = async (
  projectId: string, 
  userId: string, 
  upload: DocumentUpload
): Promise<{ success: boolean; documentId?: string; error?: string }> => {
  try {
    const docType = UK_DOCUMENT_TYPES.find(t => t.name === upload.type)
    if (!docType) {
      return { success: false, error: 'Invalid document type' }
    }
    
    // Validate file size
    if (upload.file.size > docType.max_file_size) {
      return { 
        success: false, 
        error: `File size exceeds limit of ${(docType.max_file_size / 1024 / 1024).toFixed(1)}MB` 
      }
    }
    
    // Validate file extension
    const fileExt = '.' + upload.file.name.split('.').pop()?.toLowerCase()
    if (!docType.allowed_extensions.includes(fileExt)) {
      return { 
        success: false, 
        error: `File type ${fileExt} not allowed for ${docType.display_name}` 
      }
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${projectId}/${upload.type}/${timestamp}_${upload.file.name}`
    
    // Upload to Supabase storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('project-documents')
      .upload(filename, upload.file)
    
    if (storageError) {
      return { success: false, error: storageError.message }
    }
    
    // Save document record to database
    const { data: documentData, error: dbError } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        uploaded_by: userId,
        filename: upload.file.name,
        file_path: storageData.path,
        file_size: upload.file.size,
        mime_type: upload.file.type,
        document_type: upload.type,
        description: upload.description,
        is_sensitive: upload.is_sensitive ?? docType.is_sensitive,
        requires_approval: upload.requires_approval ?? docType.requires_approval,
        status: docType.requires_approval ? 'pending_approval' : 'approved'
      })
      .select()
      .single()
    
    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('project-documents').remove([storageData.path])
      return { success: false, error: dbError.message }
    }
    
    return { success: true, documentId: documentData.id }
    
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get signed URL for document download
export const getDocumentDownloadUrl = async (
  documentId: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ url?: string; error?: string }> => {
  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_path, is_sensitive')
      .eq('id', documentId)
      .single()
    
    if (docError) {
      return { error: docError.message }
    }
    
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(document.file_path, expiresIn)
    
    if (urlError) {
      return { error: urlError.message }
    }
    
    return { url: signedUrlData.signedUrl }
    
  } catch (error: any) {
    return { error: error.message }
  }
}

// Delete document
export const deleteDocument = async (documentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get document details first
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single()
    
    if (docError) {
      return { success: false, error: docError.message }
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('project-documents')
      .remove([document.file_path])
    
    if (storageError) {
      return { success: false, error: storageError.message }
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
    
    if (dbError) {
      return { success: false, error: dbError.message }
    }
    
    return { success: true }
    
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Approve document
export const approveDocument = async (documentId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', documentId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
    
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get document type info
export const getDocumentTypeInfo = (typeName: string): DocumentType | undefined => {
  return UK_DOCUMENT_TYPES.find(type => type.name === typeName)
}

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Get document icon based on type
export const getDocumentIcon = (mimeType: string, documentType?: string): string => {
  if (documentType?.includes('photo') || mimeType.startsWith('image/')) {
    return '📷'
  }
  
  if (mimeType === 'application/pdf') {
    return '📄'
  }
  
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return '📝'
  }
  
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return '📊'
  }
  
  if (documentType === 'survey_report' || documentType === 'structural_report') {
    return '📋'
  }
  
  if (documentType?.includes('certificate')) {
    return '🏅'
  }
  
  if (documentType?.includes('contract') || documentType?.includes('quote')) {
    return '📜'
  }
  
  return '📄'
}
