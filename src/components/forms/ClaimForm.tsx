'use client'

import React from 'react'
import { ValidatedForm, InputField, TextareaField, SelectField, DateField } from './ValidatedForm'
import { createClaimSchema, updateClaimSchema, type CreateClaimFormData, type UpdateClaimFormData } from '@/lib/validation/schemas'
import { useInsurancePolicies, useClaimHandlers } from '@/hooks/useClaimsManagement'
import { generateClaimNumber } from '@/hooks/useClaimsManagement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { showErrorToast, showSuccessToast } from '@/lib/error-handling/errorHandler'
import { Badge } from '@/components/ui/badge'

interface ClaimFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<UpdateClaimFormData>
  onSubmit: (data: CreateClaimFormData | UpdateClaimFormData) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function ClaimForm({ mode, initialData, onSubmit, onCancel, isSubmitting }: ClaimFormProps) {
  const { data: policies = [], isLoading: policiesLoading } = useInsurancePolicies()
  const { data: handlers = [], isLoading: handlersLoading } = useClaimHandlers()

  // Default values for new claims
  const defaultValues = mode === 'create' ? {
    claim_number: generateClaimNumber(),
    priority: 'normal' as const,
    complexity: 'standard' as const,
    incident_date: new Date().toISOString().split('T')[0],
    ...initialData
  } : initialData

  const schema = mode === 'create' ? createClaimSchema : updateClaimSchema

  const handleSubmit = async (data: CreateClaimFormData | UpdateClaimFormData) => {
    try {
      await onSubmit(data)
      showSuccessToast(
        `Claim ${mode === 'create' ? 'created' : 'updated'} successfully`,
        'Success'
      )
    } catch (error: any) {
      showErrorToast(error.message || 'An error occurred while saving the claim')
    }
  }

  // Prepare options for selects
  const policyOptions = policies.map(policy => ({
    value: policy.id,
    label: `${policy.policy_number} (${policy.policy_type})`
  }))

  const handlerOptions = [
    { value: '', label: 'Unassigned' },
    ...handlers.map(handler => ({
      value: handler.id,
      label: `${handler.first_name} ${handler.surname} (${handler.role})`
    }))
  ]

  const claimTypeOptions = [
    { value: 'property_damage', label: 'Property Damage' },
    { value: 'liability', label: 'Liability' },
    { value: 'business_interruption', label: 'Business Interruption' },
    { value: 'motor', label: 'Motor' },
    { value: 'travel', label: 'Travel' },
    { value: 'personal_accident', label: 'Personal Accident' },
    { value: 'professional_indemnity', label: 'Professional Indemnity' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const complexityOptions = [
    { value: 'simple', label: 'Simple' },
    { value: 'standard', label: 'Standard' },
    { value: 'complex', label: 'Complex' }
  ]

  const statusOptions = mode === 'edit' ? [
    { value: 'reported', label: 'Reported' },
    { value: 'investigating', label: 'Under Investigation' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'declined', label: 'Declined' },
    { value: 'settled', label: 'Settled' },
    { value: 'closed', label: 'Closed' }
  ] : []

  return (
    <div className="max-w-4xl mx-auto">
      <ValidatedForm
        schema={schema}
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        isSubmitting={isSubmitting}
        showSubmitButton={false}
        className="space-y-8"
      >
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === 'create' ? 'Create New Claim' : 'Edit Claim'}
              {mode === 'edit' && initialData?.status && (
                <Badge variant="outline">
                  {initialData.status.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {mode === 'create' 
                ? 'Enter the details for the new insurance claim' 
                : 'Update the claim information below'
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="claim_number"
                label="Claim Number"
                placeholder="CLM-2024-000001"
                required
                disabled={mode === 'edit'}
              />
              
              <SelectField
                name="policy_id"
                label="Insurance Policy"
                options={policyOptions}
                placeholder={policiesLoading ? 'Loading policies...' : 'Select a policy'}
                required
                disabled={policiesLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateField
                name="incident_date"
                label="Incident Date"
                required
                maxDate={new Date()}
              />
              
              <SelectField
                name="claim_type"
                label="Claim Type"
                options={claimTypeOptions}
                placeholder="Select claim type"
                required
              />
            </div>

            <InputField
              name="cause_of_loss"
              label="Cause of Loss"
              placeholder="Brief description of what caused the loss"
            />
          </CardContent>
        </Card>

        {/* Incident Details */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TextareaField
              name="incident_description"
              label="Incident Description"
              placeholder="Provide a detailed description of the incident..."
              rows={5}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="estimated_loss"
                label="Estimated Loss (£)"
                type="number"
                placeholder="0.00"
                min={0}
                step={0.01}
              />

              {mode === 'edit' && (
                <InputField
                  name="final_settlement"
                  label="Final Settlement (£)"
                  type="number"
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              )}
            </div>

            {mode === 'edit' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  name="excess_applied"
                  label="Excess Applied (£)"
                  type="number"
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />

                <InputField
                  name="reserved_amount"
                  label="Reserved Amount (£)"
                  type="number"
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment and Classification */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment & Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SelectField
                name="priority"
                label="Priority"
                options={priorityOptions}
                required
              />
              
              <SelectField
                name="complexity"
                label="Complexity"
                options={complexityOptions}
                required
              />

              {mode === 'edit' && (
                <SelectField
                  name="status"
                  label="Status"
                  options={statusOptions}
                  placeholder="Select status"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                name="handler_id"
                label="Claims Handler"
                options={handlerOptions}
                placeholder={handlersLoading ? 'Loading handlers...' : 'Select a handler'}
                disabled={handlersLoading}
              />
              
              <SelectField
                name="adjuster_id"
                label="Adjuster"
                options={handlerOptions}
                placeholder={handlersLoading ? 'Loading adjusters...' : 'Select an adjuster'}
                disabled={handlersLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end gap-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  mode === 'create' ? 'Create Claim' : 'Update Claim'
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </ValidatedForm>
    </div>
  )
}