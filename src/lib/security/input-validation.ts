// Comprehensive input validation and sanitization for security
import DOMPurify from 'isomorphic-dompurify'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit/audit-trail'
import { captureSecurityEvent } from '@/lib/monitoring/error-monitoring'

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  sanitizedValue?: any
  errors: string[]
  warnings: string[]
  riskScore: number
}

// Input types for different validation rules
export enum InputType {
  EMAIL = 'email',
  PHONE = 'phone',
  NAME = 'name',
  ADDRESS = 'address',
  SSN = 'ssn',
  CURRENCY = 'currency',
  DATE = 'date',
  URL = 'url',
  HTML = 'html',
  SQL = 'sql',
  FILENAME = 'filename',
  JSON = 'json',
  CREDIT_CARD = 'credit_card',
  ROUTING_NUMBER = 'routing_number',
  ACCOUNT_NUMBER = 'account_number',
  TAX_ID = 'tax_id',
  CLAIM_NUMBER = 'claim_number',
  PROJECT_ID = 'project_id',
  FREE_TEXT = 'free_text'
}

// Security patterns to detect malicious input
const SECURITY_PATTERNS = {
  SQL_INJECTION: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\'|\"\s*;\s*--)/gi,
    /(\bSCHEMA\b|\bTABLE\b|\bDATABASE\b)/gi
  ],
  
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ],
  
  LDAP_INJECTION: [
    /[\(\)\*\\\x00]/g,
    /\|\|/g,
    /&&/g
  ],
  
  COMMAND_INJECTION: [
    /[;&|`$]/g,
    /\b(rm|del|format|shutdown|reboot)\b/gi,
    /\.\.[\/\\]/g
  ],
  
  PATH_TRAVERSAL: [
    /\.\.[\/\\]/g,
    /[\/\\]etc[\/\\]/gi,
    /[\/\\]windows[\/\\]/gi,
    /[\/\\]system32[\/\\]/gi
  ]
}

// Validation rules for different input types
const VALIDATION_RULES = {
  [InputType.EMAIL]: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254,
    minLength: 5,
    required: true
  },
  
  [InputType.PHONE]: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    maxLength: 20,
    minLength: 10,
    sanitize: (value: string) => value.replace(/[^\d\+]/g, '')
  },
  
  [InputType.NAME]: {
    pattern: /^[a-zA-Z\s\-\.']{1,50}$/,
    maxLength: 50,
    minLength: 1,
    sanitize: (value: string) => value.replace(/[<>\"'&]/g, '').trim()
  },
  
  [InputType.SSN]: {
    pattern: /^\d{3}-?\d{2}-?\d{4}$/,
    maxLength: 11,
    minLength: 9,
    sanitize: (value: string) => value.replace(/[^\d]/g, ''),
    sensitive: true
  },
  
  [InputType.CURRENCY]: {
    pattern: /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/,
    maxLength: 20,
    sanitize: (value: string) => value.replace(/[^\d.,]/g, '')
  },
  
  [InputType.CREDIT_CARD]: {
    pattern: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
    maxLength: 19,
    minLength: 15,
    sanitize: (value: string) => value.replace(/[^\d]/g, ''),
    sensitive: true
  },
  
  [InputType.FILENAME]: {
    pattern: /^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{1,4}$/,
    maxLength: 255,
    forbidden: ['exe', 'bat', 'cmd', 'scr', 'com', 'pif', 'vbs', 'js']
  },
  
  [InputType.URL]: {
    maxLength: 2048,
    allowedProtocols: ['http:', 'https:'],
    sanitize: (value: string) => encodeURI(value.trim())
  },
  
  [InputType.FREE_TEXT]: {
    maxLength: 5000,
    sanitize: (value: string) => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })
  }
}

class InputValidator {
  private static instance: InputValidator
  private suspiciousPatterns: Map<string, number> = new Map()
  private validationCache: Map<string, ValidationResult> = new Map()
  private cacheSize = 1000

  private constructor() {
    console.log('🛡️  Input validator initialized')
  }

  public static getInstance(): InputValidator {
    if (!this.instance) {
      this.instance = new InputValidator()
    }
    return this.instance
  }

  // Main validation method
  validate(
    input: any,
    type: InputType,
    context?: {
      userId?: string
      fieldName?: string
      required?: boolean
      customRules?: any
    }
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      riskScore: 0
    }

    try {
      // Handle null/undefined
      if (input === null || input === undefined || input === '') {
        if (context?.required !== false && VALIDATION_RULES[type]?.required) {
          result.isValid = false
          result.errors.push('Field is required')
          return result
        }
        result.sanitizedValue = input
        return result
      }

      // Convert to string for validation
      const stringValue = String(input).trim()
      
      // Check for security threats
      const securityCheck = this.checkSecurityPatterns(stringValue, context)
      result.riskScore += securityCheck.riskScore
      result.warnings.push(...securityCheck.warnings)
      
      if (securityCheck.blocked) {
        result.isValid = false
        result.errors.push('Input contains potentially malicious content')
        
        // Log security incident
        this.logSecurityIncident(stringValue, type, context, securityCheck.threats)
        
        return result
      }

      // Type-specific validation
      const typeValidation = this.validateByType(stringValue, type, context)
      result.isValid = typeValidation.isValid
      result.errors.push(...typeValidation.errors)
      result.warnings.push(...typeValidation.warnings)
      result.riskScore += typeValidation.riskScore

      // Apply sanitization if validation passed
      if (result.isValid) {
        result.sanitizedValue = this.sanitizeInput(stringValue, type)
      }

      // Cache result for performance
      if (this.validationCache.size < this.cacheSize) {
        const cacheKey = `${type}_${this.hashInput(stringValue)}`
        this.validationCache.set(cacheKey, result)
      }

      return result

    } catch (error) {
      console.error('Validation error:', error)
      result.isValid = false
      result.errors.push('Validation system error')
      result.riskScore = 10
      return result
    }
  }

  // Check for security attack patterns
  private checkSecurityPatterns(
    input: string, 
    context?: any
  ): {
    riskScore: number
    warnings: string[]
    threats: string[]
    blocked: boolean
  } {
    let riskScore = 0
    const warnings: string[] = []
    const threats: string[] = []
    let blocked = false

    // SQL Injection detection
    for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
      if (pattern.test(input)) {
        threats.push('sql_injection')
        riskScore += 8
        blocked = true
        break
      }
    }

    // XSS detection
    for (const pattern of SECURITY_PATTERNS.XSS) {
      if (pattern.test(input)) {
        threats.push('xss')
        riskScore += 7
        blocked = true
        break
      }
    }

    // Command injection detection
    for (const pattern of SECURITY_PATTERNS.COMMAND_INJECTION) {
      if (pattern.test(input)) {
        threats.push('command_injection')
        riskScore += 9
        blocked = true
        break
      }
    }

    // Path traversal detection
    for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
      if (pattern.test(input)) {
        threats.push('path_traversal')
        riskScore += 6
        warnings.push('Path traversal pattern detected')
        break
      }
    }

    // LDAP injection detection
    for (const pattern of SECURITY_PATTERNS.LDAP_INJECTION) {
      if (pattern.test(input)) {
        threats.push('ldap_injection')
        riskScore += 5
        warnings.push('LDAP injection pattern detected')
        break
      }
    }

    // Suspicious length
    if (input.length > 10000) {
      riskScore += 2
      warnings.push('Unusually long input')
    }

    // Encoding attacks
    if (this.hasEncodingAttack(input)) {
      threats.push('encoding_attack')
      riskScore += 4
      warnings.push('Encoding-based attack detected')
    }

    // Binary content
    if (this.hasBinaryContent(input)) {
      riskScore += 3
      warnings.push('Binary content detected')
    }

    return { riskScore, warnings, threats, blocked }
  }

  // Type-specific validation
  private validateByType(
    input: string,
    type: InputType,
    context?: any
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    riskScore: number
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let riskScore = 0
    
    const rules = VALIDATION_RULES[type]
    if (!rules) {
      return { isValid: true, errors, warnings, riskScore }
    }

    // Length validation
    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Input exceeds maximum length of ${rules.maxLength}`)
    }

    if (rules.minLength && input.length < rules.minLength) {
      errors.push(`Input below minimum length of ${rules.minLength}`)
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push(`Input format is invalid for ${type}`)
    }

    // Specific type validations
    switch (type) {
      case InputType.EMAIL:
        if (!this.isValidEmail(input)) {
          errors.push('Invalid email format')
        }
        break

      case InputType.URL:
        try {
          const url = new URL(input)
          if (rules.allowedProtocols && !rules.allowedProtocols.includes(url.protocol)) {
            errors.push('URL protocol not allowed')
            riskScore += 3
          }
        } catch {
          errors.push('Invalid URL format')
        }
        break

      case InputType.FILENAME:
        const extension = input.split('.').pop()?.toLowerCase()
        if (extension && rules.forbidden?.includes(extension)) {
          errors.push('File type not allowed')
          riskScore += 5
        }
        break

      case InputType.JSON:
        try {
          JSON.parse(input)
        } catch {
          errors.push('Invalid JSON format')
        }
        break

      case InputType.CREDIT_CARD:
        if (!this.isValidCreditCard(input.replace(/[^\d]/g, ''))) {
          errors.push('Invalid credit card number')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    }
  }

  // Sanitize input based on type
  private sanitizeInput(input: string, type: InputType): any {
    const rules = VALIDATION_RULES[type]
    
    // Apply type-specific sanitization
    if (rules?.sanitize) {
      input = rules.sanitize(input)
    }

    // General sanitization
    switch (type) {
      case InputType.HTML:
        return DOMPurify.sanitize(input, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: []
        })

      case InputType.FREE_TEXT:
        return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })

      case InputType.URL:
        return encodeURI(input.trim())

      case InputType.FILENAME:
        return input.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim()

      default:
        return input.trim()
    }
  }

  // Validate multiple fields
  validateFields(
    data: Record<string, any>,
    schema: Record<string, { type: InputType; required?: boolean; customRules?: any }>,
    context?: { userId?: string }
  ): {
    isValid: boolean
    results: Record<string, ValidationResult>
    sanitizedData: Record<string, any>
    overallRiskScore: number
  } {
    const results: Record<string, ValidationResult> = {}
    const sanitizedData: Record<string, any> = {}
    let isValid = true
    let overallRiskScore = 0

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const fieldValue = data[fieldName]
      const result = this.validate(fieldValue, fieldSchema.type, {
        ...context,
        fieldName,
        required: fieldSchema.required,
        customRules: fieldSchema.customRules
      })

      results[fieldName] = result
      
      if (result.isValid && result.sanitizedValue !== undefined) {
        sanitizedData[fieldName] = result.sanitizedValue
      }

      if (!result.isValid) {
        isValid = false
      }

      overallRiskScore += result.riskScore
    }

    // Log high-risk validation attempts
    if (overallRiskScore > 15) {
      logAuditEvent(AUDIT_ACTIONS.SECURITY_BREACH_DETECTED, 'validation', context?.userId, {
        riskScore: overallRiskScore,
        fieldCount: Object.keys(schema).length,
        failedFields: Object.keys(results).filter(key => !results[key].isValid)
      })
    }

    return {
      isValid,
      results,
      sanitizedData,
      overallRiskScore
    }
  }

  // Helper methods
  private isValidEmail(email: string): boolean {
    // More comprehensive email validation
    if (email.length > 254) return false
    
    const parts = email.split('@')
    if (parts.length !== 2) return false
    
    const [local, domain] = parts
    if (local.length > 64 || domain.length > 253) return false
    
    return VALIDATION_RULES[InputType.EMAIL].pattern.test(email)
  }

  private isValidCreditCard(cardNumber: string): boolean {
    // Luhn algorithm validation
    let sum = 0
    let isEven = false
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i])
      
      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  }

  private hasEncodingAttack(input: string): boolean {
    // Check for various encoding attacks
    const encodingPatterns = [
      /%[0-9a-fA-F]{2}/g,        // URL encoding
      /\\u[0-9a-fA-F]{4}/g,      // Unicode escaping
      /\\x[0-9a-fA-F]{2}/g,      // Hex escaping
      /&#\d+;/g,                 // HTML numeric entities
      /&#x[0-9a-fA-F]+;/gi       // HTML hex entities
    ]

    return encodingPatterns.some(pattern => {
      const matches = input.match(pattern)
      return matches && matches.length > 5 // More than 5 encoded chars is suspicious
    })
  }

  private hasBinaryContent(input: string): boolean {
    // Check for binary content (non-printable characters)
    return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(input)
  }

  private hashInput(input: string): string {
    // Simple hash for caching (not cryptographic)
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private logSecurityIncident(
    input: string,
    type: InputType,
    context: any,
    threats: string[]
  ): void {
    captureSecurityEvent({
      type: 'security.breach_detected',
      severity: 'high',
      details: `Malicious input detected: ${threats.join(', ')}`,
      timestamp: new Date(),
      userId: context?.userId,
      metadata: {
        inputType: type,
        fieldName: context?.fieldName,
        threats,
        inputLength: input.length,
        inputPreview: input.substring(0, 100) + '...'
      }
    })

    logAuditEvent(AUDIT_ACTIONS.SECURITY_BREACH_DETECTED, 'input_validation', context?.userId, {
      inputType: type,
      fieldName: context?.fieldName,
      threats,
      blocked: true
    })
  }

  // Get validation statistics
  getValidationStats(): {
    cacheSize: number
    suspiciousPatterns: number
    threatsSummary: Record<string, number>
  } {
    const threatsCount: Record<string, number> = {}
    
    for (const [pattern, count] of this.suspiciousPatterns.entries()) {
      threatsCount[pattern] = count
    }

    return {
      cacheSize: this.validationCache.size,
      suspiciousPatterns: this.suspiciousPatterns.size,
      threatsSummary: threatsCount
    }
  }

  // Clear cache
  clearCache(): void {
    this.validationCache.clear()
    this.suspiciousPatterns.clear()
  }
}

// Export singleton
export const inputValidator = InputValidator.getInstance()

// Convenience functions
export const validateInput = (input: any, type: InputType, context?: any) =>
  inputValidator.validate(input, type, context)

export const validateFields = (data: Record<string, any>, schema: Record<string, any>, context?: any) =>
  inputValidator.validateFields(data, schema, context)

export const sanitizeHTML = (html: string) => 
  DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'], ALLOWED_ATTR: [] })

export const sanitizeText = (text: string) => 
  DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })

// React hook for input validation
export function useInputValidation() {
  return {
    validate: validateInput,
    validateFields,
    sanitizeHTML,
    sanitizeText,
    InputType,
    getValidationStats: () => inputValidator.getValidationStats()
  }
}