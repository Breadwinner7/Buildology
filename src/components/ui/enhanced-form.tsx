'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Label } from './label'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Eye, EyeOff, Search, Calendar, Mail, Phone, MapPin, Building, User, CreditCard } from 'lucide-react'

interface EnhancedInputProps {
  id: string
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  icon?: React.ReactNode
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function EnhancedInput({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  error,
  hint,
  required = false,
  disabled = false,
  className
}: EnhancedInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [focused, setFocused] = React.useState(false)

  const inputType = type === 'password' && showPassword ? 'text' : type

  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'tel': return <Phone className="w-4 h-4" />
      case 'search': return <Search className="w-4 h-4" />
      case 'date': return <Calendar className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={id} 
        className={cn(
          'text-sm font-medium transition-colors',
          focused && 'text-primary',
          error && 'text-red-600'
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative group">
        {getIcon() && (
          <div className={cn(
            'absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors',
            focused ? 'text-primary' : 'text-muted-foreground',
            error && 'text-red-500'
          )}>
            {getIcon()}
          </div>
        )}
        
        <Input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className={cn(
            'transition-all duration-200 rounded-xl',
            getIcon() && 'pl-10',
            type === 'password' && 'pr-10',
            focused && 'ring-2 ring-primary/20 border-primary/50',
            error && 'border-red-500 ring-2 ring-red-500/20',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 animate-slide-in">{error}</p>
      )}
    </div>
  )
}

interface FormCardProps {
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: (e: React.FormEvent) => void
  submitLabel?: string
  isLoading?: boolean
  className?: string
  icon?: React.ReactNode
}

export function FormCard({
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Submit',
  isLoading = false,
  className,
  icon
}: FormCardProps) {
  return (
    <Card className={cn('card-elevated', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon && (
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {icon}
            </div>
          )}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-balance">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-6">
          {children}
          
          {onSubmit && (
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="rounded-xl px-8 hover:shadow-lg transition-shadow"
              >
                {isLoading ? 'Processing...' : submitLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  )
}

interface StepFormProps {
  steps: Array<{
    title: string
    description?: string
    content: React.ReactNode
  }>
  currentStep: number
  onStepChange: (step: number) => void
  onComplete?: () => void
  className?: string
}

export function StepForm({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  className
}: StepFormProps) {
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all cursor-pointer',
                  index <= currentStep
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                onClick={() => onStepChange(index)}
              >
                {index + 1}
              </div>
              <div className="text-xs text-center mt-2 max-w-16">
                <span className={cn(
                  'font-medium',
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {step.title}
                </span>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4 transition-colors',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-xl">
            {steps[currentStep].title}
          </CardTitle>
          {steps[currentStep].description && (
            <CardDescription className="text-balance">
              {steps[currentStep].description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="animate-fade-in">
            {steps[currentStep].content}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          className="rounded-xl"
        >
          Previous
        </Button>
        
        <Button
          onClick={() => {
            if (isLastStep && onComplete) {
              onComplete()
            } else {
              onStepChange(currentStep + 1)
            }
          }}
          disabled={isLastStep && !onComplete}
          className="rounded-xl px-8"
        >
          {isLastStep ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  )
}

// Predefined form field types for common use cases
export function PersonalInfoFields({
  values,
  onChange,
  errors
}: {
  values: Record<string, string>
  onChange: (field: string, value: string) => void
  errors: Record<string, string>
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <EnhancedInput
        id="firstName"
        label="First Name"
        value={values.firstName || ''}
        onChange={(value) => onChange('firstName', value)}
        icon={<User className="w-4 h-4" />}
        error={errors.firstName}
        required
      />
      
      <EnhancedInput
        id="lastName"
        label="Last Name"
        value={values.lastName || ''}
        onChange={(value) => onChange('lastName', value)}
        icon={<User className="w-4 h-4" />}
        error={errors.lastName}
        required
      />
      
      <EnhancedInput
        id="email"
        label="Email Address"
        type="email"
        value={values.email || ''}
        onChange={(value) => onChange('email', value)}
        error={errors.email}
        required
      />
      
      <EnhancedInput
        id="phone"
        label="Phone Number"
        type="tel"
        value={values.phone || ''}
        onChange={(value) => onChange('phone', value)}
        error={errors.phone}
        hint="Include country code if international"
      />
    </div>
  )
}

export function AddressFields({
  values,
  onChange,
  errors
}: {
  values: Record<string, string>
  onChange: (field: string, value: string) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-6">
      <EnhancedInput
        id="address1"
        label="Address Line 1"
        value={values.address1 || ''}
        onChange={(value) => onChange('address1', value)}
        icon={<MapPin className="w-4 h-4" />}
        error={errors.address1}
        required
      />
      
      <EnhancedInput
        id="address2"
        label="Address Line 2"
        value={values.address2 || ''}
        onChange={(value) => onChange('address2', value)}
        error={errors.address2}
        hint="Apartment, suite, unit, building, floor, etc."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EnhancedInput
          id="city"
          label="City"
          value={values.city || ''}
          onChange={(value) => onChange('city', value)}
          icon={<Building className="w-4 h-4" />}
          error={errors.city}
          required
        />
        
        <EnhancedInput
          id="state"
          label="State/County"
          value={values.state || ''}
          onChange={(value) => onChange('state', value)}
          error={errors.state}
          required
        />
        
        <EnhancedInput
          id="postcode"
          label="Postcode"
          value={values.postcode || ''}
          onChange={(value) => onChange('postcode', value)}
          error={errors.postcode}
          required
        />
      </div>
    </div>
  )
}