/**
 * Comprehensive validation and sanitization utilities
 * Enterprise-grade data validation with TypeScript support
 */

import DOMPurify from 'isomorphic-dompurify'

// Base validation result type
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: any
}

// Validation rule types
export type ValidationRule<T = any> = {
  validate: (value: T) => boolean | Promise<boolean>
  message: string
  sanitize?: (value: T) => T
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  postcode: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
}

// Sanitization functions
export const Sanitizers = {
  // HTML sanitization
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: []
    })
  },

  // Strip all HTML tags
  stripHtml: (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
  },

  // Email sanitization
  email: (input: string): string => {
    return input.toLowerCase().trim()
  },

  // Phone number sanitization
  phone: (input: string): string => {
    return input.replace(/[^\d+]/g, '')
  },

  // Name sanitization
  name: (input: string): string => {
    return input
      .replace(/[^a-zA-Z\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  },

  // Slug sanitization
  slug: (input: string): string => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  },

  // Numeric sanitization
  number: (input: string | number): number => {
    const num = typeof input === 'string' ? parseFloat(input.replace(/[^0-9.-]/g, '')) : input
    return isNaN(num) ? 0 : num
  },

  // Currency sanitization
  currency: (input: string | number): number => {
    const cleaned = typeof input === 'string' 
      ? input.replace(/[£$€¥,\s]/g, '') 
      : input.toString()
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : Math.round(num * 100) / 100
  },

  // Postcode sanitization
  postcode: (input: string): string => {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/(.{3,4})(.{3})$/, '$1 $2')
  }
}

// Pre-built validation rules
export const ValidationRules = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validate: (value) => !value || ValidationPatterns.email.test(value),
    message,
    sanitize: Sanitizers.email
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule<string> => ({
    validate: (value) => !value || ValidationPatterns.phone.test(Sanitizers.phone(value)),
    message,
    sanitize: Sanitizers.phone
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Must be no more than ${max} characters long`
  }),

  pattern: (pattern: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (value) => !value || pattern.test(value),
    message
  }),

  numeric: (message = 'Must be a valid number'): ValidationRule<string | number> => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return !isNaN(num) && isFinite(num)
    },
    message,
    sanitize: Sanitizers.number
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message || `Must be no more than ${max}`
  }),

  currency: (message = 'Please enter a valid amount'): ValidationRule<string | number> => ({
    validate: (value) => {
      const num = Sanitizers.currency(value)
      return num >= 0 && num <= 999999999.99
    },
    message,
    sanitize: Sanitizers.currency
  }),

  postcode: (message = 'Please enter a valid UK postcode'): ValidationRule<string> => ({
    validate: (value) => !value || ValidationPatterns.postcode.test(value),
    message,
    sanitize: Sanitizers.postcode
  }),

  strongPassword: (message = 'Password must be at least 8 characters with uppercase, lowercase, number and special character'): ValidationRule<string> => ({
    validate: (value) => !value || ValidationPatterns.strongPassword.test(value),
    message
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule<string> => ({
    validate: (value) => !value || ValidationPatterns.url.test(value),
    message
  }),

  uuid: (message = 'Invalid ID format'): ValidationRule<string> => ({
    validate: (value) => !value || ValidationPatterns.uuid.test(value),
    message
  }),

  // Custom async validation
  unique: <T>(
    checkUnique: (value: T) => Promise<boolean>,
    message = 'This value already exists'
  ): ValidationRule<T> => ({
    validate: checkUnique,
    message
  }),

  // Date validations
  futureDate: (message = 'Date must be in the future'): ValidationRule<string | Date> => ({
    validate: (value) => {
      if (!value) return true
      const date = new Date(value)
      return date > new Date()
    },
    message
  }),

  pastDate: (message = 'Date must be in the past'): ValidationRule<string | Date> => ({
    validate: (value) => {
      if (!value) return true
      const date = new Date(value)
      return date < new Date()
    },
    message
  })
}

// Schema-based validator class
export class Validator<T extends Record<string, any>> {
  private schema: Record<keyof T, ValidationRule<any>[]>

  constructor(schema: Record<keyof T, ValidationRule<any>[]>) {
    this.schema = schema
  }

  async validate(data: Partial<T>): Promise<{
    isValid: boolean
    errors: Record<keyof T, string[]>
    sanitizedData: T
  }> {
    const errors: Record<keyof T, string[]> = {} as any
    const sanitizedData: T = {} as T

    for (const [field, rules] of Object.entries(this.schema) as [keyof T, ValidationRule<any>[]][]) {
      const value = data[field]
      const fieldErrors: string[] = []
      let sanitizedValue = value

      for (const rule of rules) {
        try {
          const isValid = await rule.validate(value)
          
          if (!isValid) {
            fieldErrors.push(rule.message)
          } else if (rule.sanitize) {
            sanitizedValue = rule.sanitize(value)
          }
        } catch (error) {
          fieldErrors.push('Validation error occurred')
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors
      }

      sanitizedData[field] = sanitizedValue
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    }
  }

  validateField(field: keyof T, value: any): Promise<ValidationResult> {
    const rules = this.schema[field] || []
    return this.validateValue(value, rules)
  }

  private async validateValue(value: any, rules: ValidationRule<any>[]): Promise<ValidationResult> {
    const errors: string[] = []
    let sanitizedValue = value

    for (const rule of rules) {
      try {
        const isValid = await rule.validate(value)
        
        if (!isValid) {
          errors.push(rule.message)
        } else if (rule.sanitize) {
          sanitizedValue = rule.sanitize(value)
        }
      } catch (error) {
        errors.push('Validation error occurred')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    }
  }
}

// Quick validation functions
export const validate = {
  email: (email: string) => ValidationPatterns.email.test(email),
  phone: (phone: string) => ValidationPatterns.phone.test(phone),
  postcode: (postcode: string) => ValidationPatterns.postcode.test(postcode),
  url: (url: string) => ValidationPatterns.url.test(url),
  uuid: (uuid: string) => ValidationPatterns.uuid.test(uuid),
  strongPassword: (password: string) => ValidationPatterns.strongPassword.test(password)
}

// Quick sanitization functions
export const sanitize = Sanitizers

// Form validation hook for React
export function useFormValidation<T extends Record<string, any>>(
  schema: Record<keyof T, ValidationRule<any>[]>
) {
  const validator = new Validator(schema)
  
  const validateForm = (data: Partial<T>) => validator.validate(data)
  const validateField = (field: keyof T, value: any) => validator.validateField(field, value)

  return { validateForm, validateField }
}

// Type-safe form data interface
export interface FormData {
  [key: string]: string | number | boolean | Date | null | undefined
}

// Common validation schemas
export const CommonSchemas = {
  user: {
    first_name: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(50)],
    surname: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(50)],
    email: [ValidationRules.required(), ValidationRules.email()],
    phone: [ValidationRules.phone()],
    postcode: [ValidationRules.postcode()]
  },
  
  project: {
    name: [ValidationRules.required(), ValidationRules.minLength(3), ValidationRules.maxLength(100)],
    description: [ValidationRules.maxLength(1000)],
    budget: [ValidationRules.currency()],
    target_completion_date: [ValidationRules.futureDate()]
  },
  
  message: {
    content: [ValidationRules.required(), ValidationRules.minLength(1), ValidationRules.maxLength(2000)]
  }
}