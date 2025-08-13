import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()

  try {
    // Create test organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organisations')
      .insert([
        {
          name: 'ABC Contractors Ltd',
          type: 'contractor_firm',
          company_number: 'CON12345',
          is_active: true,
          contractor_specialties: ['roofing', 'plumbing', 'electrical'],
          geographic_coverage: ['London', 'Essex', 'Kent']
        },
        {
          name: 'XYZ Surveyors Practice',
          type: 'surveyor_practice',
          company_number: 'SURV67890',
          is_active: true,
          rics_regulated: true,
          survey_types_offered: ['structural', 'damage_assessment', 'valuation']
        }
      ])
      .select()

    if (orgError) {
      console.error('Error creating organizations:', orgError)
    }

    // Create test users with different roles
    const testUsers = [
      {
        email: 'john.contractor@test.com',
        first_name: 'John',
        surname: 'Builder',
        role: 'contractor',
        organisation_id: orgs?.[0]?.id,
        trade_specialties: ['roofing', 'general_building'],
        years_experience: 10,
        hourly_rate: 45,
        daily_rate: 350,
        contractor_license_number: 'CTR001'
      },
      {
        email: 'jane.surveyor@test.com',
        first_name: 'Jane',
        surname: 'Inspector',
        role: 'surveyor',
        organisation_id: orgs?.[1]?.id,
        surveyor_level: 'senior',
        rics_membership_number: 'RICS123456',
        surveyor_specialisms: ['structural', 'damage_assessment']
      },
      {
        email: 'bob.customer@test.com',
        first_name: 'Bob',
        surname: 'Smith',
        role: 'policyholder',
        customer_type: 'individual',
        risk_category: 'standard',
        business_name: 'Smith Properties'
      },
      {
        email: 'admin@test.com',
        first_name: 'Admin',
        surname: 'User',
        role: 'admin',
        job_title: 'System Administrator'
      }
    ]

    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .upsert(testUsers, { onConflict: 'email' })
      .select()

    if (userError) {
      console.error('Error creating users:', userError)
      return NextResponse.json({ 
        error: 'Failed to create test users', 
        details: userError.message 
      }, { status: 500 })
    }

    // Link users to organizations
    if (orgs && users) {
      const userOrgLinks = []
      
      // Link contractor to contractor firm
      const contractor = users.find(u => u.role === 'contractor')
      if (contractor && orgs[0]) {
        userOrgLinks.push({
          user_id: contractor.id,
          organisation_id: orgs[0].id,
          role: 'member'
        })
      }

      // Link surveyor to surveyor practice
      const surveyor = users.find(u => u.role === 'surveyor')
      if (surveyor && orgs[1]) {
        userOrgLinks.push({
          user_id: surveyor.id,
          organisation_id: orgs[1].id,
          role: 'member'
        })
      }

      if (userOrgLinks.length > 0) {
        const { error: linkError } = await supabase
          .from('user_organisations')
          .upsert(userOrgLinks, { onConflict: 'user_id,organisation_id' })

        if (linkError) {
          console.error('Error linking users to organizations:', linkError)
        }
      }
    }

    // Create a test policy for the policyholder
    const policyholder = users?.find(u => u.role === 'policyholder')
    if (policyholder) {
      const { error: policyError } = await supabase
        .from('insurance_policies')
        .insert({
          policy_number: 'POL-2024-001',
          policyholder_id: policyholder.id,
          policy_type: 'buildings',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          premium_amount: 1200,
          coverage_limit: 500000
        })

      if (policyError) {
        console.error('Error creating policy:', policyError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        organizations: orgs?.length || 0,
        users: users?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Error creating test data:', error)
    return NextResponse.json({ 
      error: 'Failed to create test data', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()

  try {
    // Get counts of different user types
    const { count: contractorCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'contractor')

    const { count: surveyorCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'surveyor')

    const { count: policyholderCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'policyholder')

    const { count: orgCount } = await supabase
      .from('organisations')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      contractors: contractorCount || 0,
      surveyors: surveyorCount || 0,
      policyholders: policyholderCount || 0,
      organizations: orgCount || 0
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to get counts', 
      details: error.message 
    }, { status: 500 })
  }
}