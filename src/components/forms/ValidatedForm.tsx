'use client'

import React, { ReactNode } from 'react'
import { useForm, UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ZodSchema } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, AlertCircle, Loader2 } from 'lucide-react'

// Form field props
export interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export interface InputFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  autoComplete?: string
  min?: number
  max?: number
  step?: number
}

export interface TextareaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string
  rows?: number
}

export interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

export interface CheckboxFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  text?: string
}

export interface RadioFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: { value: string; label: string; disabled?: boolean }[]
}

export interface SwitchFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  text?: string
}

export interface DateFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string
  minDate?: Date
  maxDate?: Date
}

// Form context
interface FormContextType<T extends FieldValues> {
  form: UseFormReturn<T>
  isSubmitting: boolean
}

const FormContext = React.createContext<FormContextType<any> | null>(null)

// Hook to use form context
export function useFormContext<T extends FieldValues>(): FormContextType<T> {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('Form fields must be used within a ValidatedForm component')
  }
  return context
}

// Error message component
function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  )
}

// Field wrapper component
function FieldWrapper<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  children
}: BaseFieldProps<T> & { children: ReactNode }) {
  const { form } = useFormContext<T>()
  const error = form.formState.errors[name]?.message as string | undefined

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      <ErrorMessage message={error} />
    </div>
  )
}

// Form field components
export function InputField<T extends FieldValues>(props: InputFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, type = 'text', placeholder, autoComplete, min, max, step, disabled, ...fieldProps } = props

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        disabled={disabled || form.formState.isSubmitting}
        {...form.register(name, { valueAsNumber: type === 'number' })}
        className={cn(
          form.formState.errors[name] && 'border-red-500 focus:border-red-500'
        )}
      />
    </FieldWrapper>
  )
}

export function TextareaField<T extends FieldValues>(props: TextareaFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, placeholder, rows = 3, disabled, ...fieldProps } = props

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <Textarea
        id={name}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled || form.formState.isSubmitting}
        {...form.register(name)}
        className={cn(
          form.formState.errors[name] && 'border-red-500 focus:border-red-500'
        )}
      />
    </FieldWrapper>
  )
}

export function SelectField<T extends FieldValues>(props: SelectFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, options, placeholder, disabled, ...fieldProps } = props

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <Select
        value={form.watch(name) || ''}
        onValueChange={(value) => form.setValue(name, value as any)}
        disabled={disabled || form.formState.isSubmitting}
      >
        <SelectTrigger
          className={cn(
            form.formState.errors[name] && 'border-red-500 focus:border-red-500'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}

export function CheckboxField<T extends FieldValues>(props: CheckboxFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, text, disabled, ...fieldProps } = props

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={form.watch(name) || false}
          onCheckedChange={(checked) => form.setValue(name, checked as any)}
          disabled={disabled || form.formState.isSubmitting}
        />
        {text && (
          <Label
            htmlFor={name}
            className="text-sm font-normal cursor-pointer"
          >
            {text}
          </Label>
        )}
      </div>
    </FieldWrapper>
  )
}

export function RadioField<T extends FieldValues>(props: RadioFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, options, disabled, ...fieldProps } = props

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <RadioGroup
        value={form.watch(name) || ''}
        onValueChange={(value) => form.setValue(name, value as any)}
        disabled={disabled || form.formState.isSubmitting}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`${name}-${option.value}`}
              disabled={option.disabled}
            />
            <Label
              htmlFor={`${name}-${option.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FieldWrapper>
  )
}

export function SwitchField<T extends FieldValues>(props: SwitchFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, text, disabled, ...fieldProps } = props

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <div className="flex items-center space-x-2">
        <Switch
          id={name}
          checked={form.watch(name) || false}
          onCheckedChange={(checked) => form.setValue(name, checked as any)}
          disabled={disabled || form.formState.isSubmitting}
        />
        {text && (
          <Label
            htmlFor={name}
            className="text-sm font-normal cursor-pointer"
          >
            {text}
          </Label>
        )}
      </div>
    </FieldWrapper>
  )
}

export function DateField<T extends FieldValues>(props: DateFieldProps<T>) {
  const { form } = useFormContext<T>()
  const { name, placeholder = 'Select date', minDate, maxDate, disabled, ...fieldProps } = props
  const [open, setOpen] = React.useState(false)

  const value = form.watch(name)
  const dateValue = value ? new Date(value) : undefined

  return (
    <FieldWrapper {...fieldProps} name={name}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !dateValue && 'text-muted-foreground',
              form.formState.errors[name] && 'border-red-500 focus:border-red-500'
            )}
            disabled={disabled || form.formState.isSubmitting}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              form.setValue(name, date?.toISOString().split('T')[0] as any)
              setOpen(false)
            }}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}

// Main form component
export interface ValidatedFormProps<T extends FieldValues> {
  schema: ZodSchema<T>
  onSubmit: (data: T) => Promise<void> | void
  defaultValues?: Partial<T>
  children: ReactNode
  className?: string
  submitText?: string
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  showSubmitButton?: boolean
  isSubmitting?: boolean
}

export function ValidatedForm<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  submitText = 'Submit',
  submitVariant = 'default',
  showSubmitButton = true,
  isSubmitting: externalSubmitting
}: ValidatedFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any
  })

  const isSubmitting = externalSubmitting || form.formState.isSubmitting

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <FormContext.Provider value={{ form, isSubmitting }}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn('space-y-6', className)}
        noValidate
      >
        {children}
        
        {showSubmitButton && (
          <div className="flex justify-end">
            <Button
              type="submit"
              variant={submitVariant}
              disabled={isSubmitting}
              className="min-w-24"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitText}
            </Button>
          </div>
        )}
      </form>
    </FormContext.Provider>
  )
}