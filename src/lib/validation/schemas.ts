import { z } from 'zod'

// Common validation patterns
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

export const phoneSchema = z.string()
  .min(1, 'Phone number is required')
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')

export const currencySchema = z.number()
  .min(0, 'Amount must be positive')
  .max(999999999, 'Amount is too large')

export const dateSchema = z.string()
  .min(1, 'Date is required')
  .refine((date) => !isNaN(Date.parse(date)), 'Please enter a valid date')

// User Profile Schema
export const userProfileSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  surname: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  job_title: z.string()
    .max(100, 'Job title must be less than 100 characters')
    .optional(),
  role: z.enum(['admin', 'user', 'contractor', 'supplier', 'claims_handler', 'adjuster'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  })
})

// Claims Schema
export const createClaimSchema = z.object({
  claim_number: z.string()
    .min(1, 'Claim number is required')
    .max(50, 'Claim number must be less than 50 characters'),
  policy_id: z.string()
    .min(1, 'Policy is required')
    .uuid('Please select a valid policy'),
  incident_date: dateSchema,
  claim_type: z.enum([
    'property_damage',
    'liability', 
    'business_interruption',
    'motor',
    'travel',
    'personal_accident',
    'professional_indemnity'
  ], {
    errorMap: () => ({ message: 'Please select a valid claim type' })
  }),
  cause_of_loss: z.string()
    .max(200, 'Cause of loss must be less than 200 characters')
    .optional(),
  incident_description: z.string()
    .min(10, 'Please provide a detailed description (at least 10 characters)')
    .max(2000, 'Description must be less than 2000 characters'),
  estimated_loss: currencySchema.optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  complexity: z.enum(['simple', 'standard', 'complex']).default('standard'),
  handler_id: z.string().uuid().optional(),
  adjuster_id: z.string().uuid().optional()
})

export const updateClaimSchema = createClaimSchema.partial().extend({
  id: z.string().uuid('Invalid claim ID'),
  status: z.enum([
    'reported',
    'investigating', 
    'pending_approval',
    'approved',
    'declined',
    'settled',
    'closed'
  ]).optional(),
  final_settlement: currencySchema.optional(),
  excess_applied: currencySchema.optional(),
  reserved_amount: currencySchema.optional()
})

// Quote Schema
export const quoteLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  quantity: z.number()
    .min(0.01, 'Quantity must be greater than 0')
    .max(999999, 'Quantity is too large'),
  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be less than 20 characters'),
  unit_price: currencySchema,
  total: currencySchema,
  category: z.string()
    .max(50, 'Category must be less than 50 characters')
    .optional()
})

export const createQuoteSchema = z.object({
  project_id: z.string()
    .min(1, 'Project is required')
    .uuid('Please select a valid project'),
  contractor_id: z.string()
    .min(1, 'Contractor is required')
    .uuid('Please select a valid contractor'),
  quote_number: z.string()
    .min(1, 'Quote number is required')
    .max(50, 'Quote number must be less than 50 characters'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  line_items: z.array(quoteLineItemSchema)
    .min(1, 'At least one line item is required'),
  subtotal: currencySchema,
  vat_amount: currencySchema,
  total_amount: currencySchema,
  valid_until: dateSchema.optional(),
  terms_conditions: z.string()
    .max(5000, 'Terms and conditions must be less than 5000 characters')
    .optional(),
  payment_terms: z.string()
    .max(1000, 'Payment terms must be less than 1000 characters')
    .optional(),
  warranty_period: z.number()
    .min(0, 'Warranty period cannot be negative')
    .max(240, 'Warranty period cannot exceed 20 years')
    .optional()
})

export const updateQuoteSchema = createQuoteSchema.partial().extend({
  id: z.string().uuid('Invalid quote ID'),
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'expired', 'submitted']).optional(),
  rejection_reason: z.string()
    .max(1000, 'Rejection reason must be less than 1000 characters')
    .optional()
})

// Project Schema
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  contact_name: z.string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name must be less than 100 characters'),
  contact_phone: phoneSchema.optional(),
  contact_email: emailSchema,
  contact_address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  status: z.enum([
    'planning',
    'survey_booked',
    'survey_complete', 
    'awaiting_agreement',
    'planning_authorisation',
    'scheduling_works',
    'works_in_progress',
    'works_complete',
    'snagging',
    'final_accounts',
    'closed',
    'on_hold'
  ]).default('planning')
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().uuid('Invalid project ID'),
  hold_reason: z.string()
    .max(500, 'Hold reason must be less than 500 characters')
    .optional(),
  vulnerability_flags: z.record(z.boolean()).optional()
})

// Organization Schema  
export const createOrganisationSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .max(200, 'Organization name must be less than 200 characters'),
  type: z.enum([
    'insurer',
    'managing_general_agent',
    'third_party_administrator', 
    'loss_adjusting_firm',
    'claims_management_company',
    'surveyor_practice',
    'contractor_firm',
    'restoration_specialist',
    'legal_practice',
    'public_adjuster'
  ], {
    errorMap: () => ({ message: 'Please select a valid organization type' })
  }),
  company_number: z.string()
    .max(50, 'Company number must be less than 50 characters')
    .optional(),
  vat_number: z.string()
    .max(50, 'VAT number must be less than 50 characters')
    .optional(),
  fca_reference: z.string()
    .max(50, 'FCA reference must be less than 50 characters')
    .optional(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  website: z.string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  registered_address: z.object({
    line_1: z.string().max(100).optional(),
    line_2: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    postcode: z.string().max(20).optional(),
    country: z.string().max(50).optional()
  }).optional(),
  trading_address: z.object({
    line_1: z.string().max(100).optional(),
    line_2: z.string().max(100).optional(), 
    city: z.string().max(50).optional(),
    postcode: z.string().max(20).optional(),
    country: z.string().max(50).optional()
  }).optional()
})

export const updateOrganisationSchema = createOrganisationSchema.partial().extend({
  id: z.string().uuid('Invalid organization ID'),
  is_active: z.boolean().optional()
})

// Message/Thread Schema
export const createThreadSchema = z.object({
  title: z.string()
    .min(1, 'Thread title is required')
    .max(200, 'Thread title must be less than 200 characters'),
  project_id: z.string()
    .uuid('Please select a valid project')
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  participant_ids: z.array(z.string().uuid())
    .min(1, 'At least one participant is required'),
  initial_message: z.string()
    .max(5000, 'Message must be less than 5000 characters')
    .optional()
})

export const createMessageSchema = z.object({
  thread_id: z.string()
    .min(1, 'Thread ID is required')
    .uuid('Invalid thread ID'),
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be less than 5000 characters'),
  attachments: z.array(z.string()).optional()
})

// Task Schema
export const createTaskSchema = z.object({
  project_id: z.string()
    .min(1, 'Project is required')
    .uuid('Please select a valid project'),
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  assigned_to: z.string()
    .uuid('Please select a valid assignee')
    .optional(),
  due_date: dateSchema.optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid('Invalid task ID'),
  status: z.enum(['todo', 'in_progress', 'done']).optional()
})

// Appointment Schema
export const createAppointmentSchema = z.object({
  project_id: z.string()
    .uuid('Please select a valid project')
    .optional(),
  title: z.string()
    .min(1, 'Appointment title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  appointment_type: z.enum([
    'site_visit',
    'survey',
    'inspection', 
    'meeting',
    'consultation',
    'follow_up'
  ], {
    errorMap: () => ({ message: 'Please select a valid appointment type' })
  }),
  scheduled_start: z.string()
    .min(1, 'Start time is required')
    .refine((date) => !isNaN(Date.parse(date)), 'Please enter a valid date and time'),
  scheduled_end: z.string()
    .min(1, 'End time is required')
    .refine((date) => !isNaN(Date.parse(date)), 'Please enter a valid date and time'),
  location_address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  attendees: z.array(z.string().uuid())
    .min(1, 'At least one attendee is required'),
  access_instructions: z.string()
    .max(1000, 'Access instructions must be less than 1000 characters')
    .optional(),
  special_requirements: z.string()
    .max(1000, 'Special requirements must be less than 1000 characters')
    .optional(),
  confirmation_required: z.boolean().default(true)
})

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  id: z.string().uuid('Invalid appointment ID'),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  actual_start: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  actual_end: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  cancellation_reason: z.string().max(500).optional(),
  outcome_notes: z.string().max(2000).optional(),
  follow_up_required: z.boolean().optional()
})

// Export types for use in components
export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type CreateClaimFormData = z.infer<typeof createClaimSchema>
export type UpdateClaimFormData = z.infer<typeof updateClaimSchema>
export type CreateQuoteFormData = z.infer<typeof createQuoteSchema>
export type UpdateQuoteFormData = z.infer<typeof updateQuoteSchema>
export type QuoteLineItemFormData = z.infer<typeof quoteLineItemSchema>
export type CreateProjectFormData = z.infer<typeof createProjectSchema>
export type UpdateProjectFormData = z.infer<typeof updateProjectSchema>
export type CreateOrganisationFormData = z.infer<typeof createOrganisationSchema>
export type UpdateOrganisationFormData = z.infer<typeof updateOrganisationSchema>
export type CreateThreadFormData = z.infer<typeof createThreadSchema>
export type CreateMessageFormData = z.infer<typeof createMessageSchema>
export type CreateTaskFormData = z.infer<typeof createTaskSchema>
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>
export type CreateAppointmentFormData = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentFormData = z.infer<typeof updateAppointmentSchema>