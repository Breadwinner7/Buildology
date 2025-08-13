// Common types used throughout the application

// Generic API response structure
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  status: 'success' | 'error' | 'loading'
}

// Pagination types
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// File/Document types
export interface FileUpload {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadedAt: Date
  uploadedBy: string
}

// Address type (UK specific)
export interface UKAddress {
  line1: string
  line2?: string
  line3?: string
  town: string
  county?: string
  postcode: string
  uprn?: string // Unique Property Reference Number
}

// Money/Currency types for UK insurance
export interface MonetaryAmount {
  amount: number
  currency: 'GBP' | 'EUR' | 'USD'
  formatted?: string
}

// Date range type
export interface DateRange {
  start: Date | string
  end: Date | string
}

// Audit trail type
export interface AuditEntry {
  id: string
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'view'
  changes?: Record<string, { old?: unknown; new?: unknown }>
  performedBy: string
  performedAt: Date
  ipAddress?: string
  userAgent?: string
}

// Search/Filter types
export interface SearchParams {
  query?: string
  filters?: Record<string, unknown>
  dateRange?: DateRange
  status?: string[]
  assignedTo?: string[]
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  createdAt: Date
  readAt?: Date
  actionUrl?: string
  actionLabel?: string
}

// Permission/Role types
export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isActive: boolean
}

// User profile types
export interface UserProfile {
  id: string
  email: string
  firstName: string
  surname: string
  preferredName?: string
  title?: string
  role: string
  department?: string
  phoneNumber?: string
  mobileNumber?: string
  organisation?: Organisation
  permissions: Permission[]
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Organisation types
export interface Organisation {
  id: string
  name: string
  type: 'insurer' | 'broker' | 'contractor' | 'supplier' | 'professional_service'
  registrationNumber?: string
  vatNumber?: string
  address: UKAddress
  contactEmail: string
  contactPhone: string
  website?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Project/Claims types
export interface ProjectSummary {
  id: string
  claimReference: string
  title: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  totalIncurred: MonetaryAmount
  totalReserved: MonetaryAmount
  incidentDate: Date
  createdAt: Date
  updatedAt: Date
  assignedTo?: UserProfile
  organisation?: Organisation
}

// Document types specific to insurance
export interface InsuranceDocument {
  id: string
  projectId: string
  fileName: string
  fileSize: number
  fileType: string
  category: 'policy' | 'claim' | 'estimate' | 'invoice' | 'photo' | 'report' | 'correspondence' | 'legal' | 'other'
  subcategory?: string
  description?: string
  uploadedBy: string
  uploadedAt: Date
  approvedBy?: string
  approvedAt?: Date
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  confidential: boolean
  retentionDate?: Date
  metadata?: DocumentMetadata
}

// Flexible metadata for different document types
export interface DocumentMetadata {
  // Photo metadata
  location?: string
  coordinates?: { lat: number; lng: number }
  cameraSettings?: Record<string, unknown>
  
  // Invoice/Financial metadata
  invoiceNumber?: string
  supplierName?: string
  vatAmount?: number
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  
  // Report metadata  
  authorName?: string
  reportType?: string
  dateOfInspection?: Date
  conclusions?: string[]
  recommendations?: string[]
  
  // Generic extensible metadata
  customFields?: Record<string, unknown>
}

// Task types
export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  category: 'inspection' | 'communication' | 'documentation' | 'approval' | 'payment' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedTo?: string
  assignedBy: string
  dueDate?: Date
  completedAt?: Date
  estimatedHours?: number
  actualHours?: number
  dependencies?: string[]
  createdAt: Date
  updatedAt: Date
}

// Reserve types for financial tracking
export interface Reserve {
  id: string
  projectId: string
  category: 'indemnity' | 'expenses' | 'fees' | 'other'
  subcategory: string
  currentAmount: MonetaryAmount
  originalAmount: MonetaryAmount
  movements: ReserveMovement[]
  lastReviewDate?: Date
  nextReviewDate?: Date
  reviewedBy?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ReserveMovement {
  id: string
  reserveId: string
  type: 'increase' | 'decrease' | 'release'
  amount: MonetaryAmount
  reason: string
  authorisedBy: string
  authorisedAt: Date
  reference?: string
  description?: string
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface FormState<T = unknown> {
  data: T
  errors: ValidationError[]
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
}

// UI State types
export interface LoadingState {
  isLoading: boolean
  error?: string
  data?: unknown
  lastUpdated?: Date
}

export interface TableColumn<T = unknown> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

export interface TableState<T = unknown> {
  data: T[]
  columns: TableColumn<T>[]
  pagination: PaginationParams
  sorting: {
    column: keyof T
    direction: 'asc' | 'desc'
  }
  filters: Record<string, unknown>
  selectedRows: T[]
  isLoading: boolean
}

// Real-time subscription types
export interface RealtimeSubscription<T = unknown> {
  table: string
  filter?: string
  onInsert?: (newRow: T) => void
  onUpdate?: (updatedRow: T) => void
  onDelete?: (deletedRow: T) => void
}