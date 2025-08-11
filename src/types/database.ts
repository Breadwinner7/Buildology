// Database types and enums based on schema
export type UserRole = 
  | 'super_admin'
  | 'underwriting_manager'
  | 'claims_director' 
  | 'claims_manager'
  | 'senior_claims_handler'
  | 'claims_handler'
  | 'graduate_claims_handler'
  | 'technical_claims_specialist'
  | 'fraud_investigator'
  | 'litigation_manager'
  | 'customer_service'
  | 'finance_controller'
  | 'accounts_payable'
  | 'chartered_surveyor'
  | 'building_surveyor'
  | 'quantity_surveyor'
  | 'structural_engineer'
  | 'loss_adjuster'
  | 'loss_assessor'
  | 'forensic_accountant'
  | 'solicitor'
  | 'barrister'
  | 'expert_witness'
  | 'cause_and_origin_investigator'
  | 'principal_contractor'
  | 'approved_contractor'
  | 'emergency_contractor'
  | 'specialist_contractor'
  | 'restoration_technician'
  | 'drying_technician'
  | 'asbestos_contractor'
  | 'hazardous_materials_contractor'
  | 'scaffolding_contractor'
  | 'glazier'
  | 'roofer'
  | 'plumber'
  | 'electrician'
  | 'plasterer'
  | 'decorator'
  | 'flooring_contractor'
  | 'kitchen_fitter'
  | 'bathroom_fitter'
  | 'materials_supplier'
  | 'plant_hire'
  | 'waste_management'
  | 'temporary_accommodation_provider'
  | 'policyholder'
  | 'additional_insured'
  | 'tenant'
  | 'leaseholder'
  | 'freeholder'
  | 'property_manager'
  | 'facilities_manager'
  | 'company_director'
  | 'company_employee'
  | 'homeowner'
  | 'landlord'

export type ProjectStatus = 
  | 'planning'
  | 'survey_booked'
  | 'survey_complete'
  | 'awaiting_agreement'
  | 'planning_authorisation'
  | 'scheduling_works'
  | 'works_in_progress'
  | 'works_complete'
  | 'snagging'
  | 'final_accounts'
  | 'closed'
  | 'on_hold'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type DocumentType = 
  | 'Contract'
  | 'Invoice'
  | 'Quote'
  | 'Report'
  | 'Photos - Before'
  | 'Photos - During'
  | 'Photos - After'
  | 'Photos - Damage'
  | 'Technical Drawing'
  | 'Specification'
  | 'Correspondence'
  | 'Insurance Document'
  | 'Certificate'
  | 'Schedule'
  | 'Policy Document'
  | 'Claims Document'
  | 'Other'

export type OrganisationType = 
  | 'insurer'
  | 'managing_general_agent'
  | 'third_party_administrator'
  | 'loss_adjusting_firm'
  | 'claims_management_company'
  | 'surveyor_practice'
  | 'contractor_firm'
  | 'restoration_specialist'
  | 'legal_practice'
  | 'public_adjuster'

// Database table interfaces
export interface UserProfile {
  id: string
  email: string
  title?: string
  first_name: string
  surname: string
  preferred_name?: string
  job_title?: string
  role: UserRole
  professional_memberships?: string[]
  professional_certifications?: string[]
  qualification_numbers?: string[]
  cpd_current?: boolean
  mobile_phone?: string
  office_phone?: string
  emergency_contact_phone?: string
  address?: any // JSONB
  organisation_id?: string
  line_manager_id?: string
  regions_covered?: string[]
  specialisms?: string[]
  maximum_claim_value?: number
  travel_radius_miles?: number
  available_weekdays?: boolean
  available_weekends?: boolean
  available_evenings?: boolean
  available_emergency?: boolean
  can_authorise_payments?: boolean
  payment_authorisation_limit?: number
  can_instruct_contractors?: boolean
  can_settle_claims?: boolean
  settlement_authority_limit?: number
  can_access_sensitive_data?: boolean
  security_clearance_level?: 'basic' | 'enhanced' | 'government'
  last_security_check?: string
  avatar_url?: string
  timezone?: string
  preferred_language?: string
  is_active?: boolean
  last_login?: string
  created_at: string
  updated_at?: string
  // Additional fields
  date_of_birth?: string
  ni_number?: string
  emergency_contact_name?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
  professional_qualifications?: string[]
  fca_reference?: string
  vat_number?: string
  company_registration?: string
  max_authorisation_limit?: number
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  created_at: string
  current_stage?: string
  on_hold?: boolean
  hold_reason?: string
  stage_updated_at?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  contact_address?: string
  vulnerability_flags?: string[]
  hold_reason_text?: string
  hold_reason_notes?: string
  updated_at?: string
}

export interface Task {
  id: string
  project_id?: string
  assigned_to?: string
  title: string
  description?: string
  status: TaskStatus
  due_date?: string
  created_at: string
  team_id?: string
  priority: TaskPriority
  updated_at?: string
  created_by?: string
}

export interface Document {
  id: string
  project_id?: string
  user_id?: string
  name?: string
  path?: string
  type?: DocumentType
  uploaded_at: string
  note?: string
  tags?: string[]
  file_size?: number
  updated_at?: string
  workflow_stage?: string
  approval_status?: string
  approved_by?: string
  approved_at?: string
  version_number?: number
  supersedes_document_id?: string
  retention_policy?: string
  destruction_date?: string
  confidentiality_level?: string
  visible_to_contractors?: boolean
  visible_to_customers?: boolean
  visibility_level?: 'internal' | 'contractors' | 'customers' | 'public'
  shared_by?: string
  shared_at?: string
  uploaded_by_role?: string
  visibility?: 'private' | 'project_team' | 'public'
}

export interface Appointment {
  id: string
  project_id?: string
  title: string
  description?: string
  appointment_type: string
  scheduled_start: string
  scheduled_end: string
  actual_start?: string
  actual_end?: string
  location_address?: string
  location_coordinates?: any // point type
  organizer_id?: string
  attendees: string[]
  status: AppointmentStatus
  cancellation_reason?: string
  access_instructions?: string
  special_requirements?: string
  confirmation_required?: boolean
  reminder_sent?: boolean
  outcome_notes?: string
  follow_up_required?: boolean
  created_at: string
  updated_at?: string
}

export interface Organisation {
  id: string
  name: string
  type: OrganisationType
  company_number?: string
  vat_number?: string
  fca_reference?: string
  professional_memberships?: string[]
  registered_address?: any // JSONB
  trading_address?: any // JSONB
  phone?: string
  email?: string
  website?: string
  pi_insurance_expiry?: string
  public_liability_limit?: number
  employers_liability_ref?: string
  established_date?: string
  employee_count?: number
  annual_turnover?: number
  is_active?: boolean
  created_at: string
  updated_at?: string
}