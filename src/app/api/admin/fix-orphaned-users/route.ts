import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS (copied from create-users route)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Test Insurance Company ID
const TEST_ORGANIZATION_ID = "279b3912-7f53-43da-a7e6-720ea18f435d"

export async function POST(request: Request) {
  try {
    console.log('=== Fix Orphaned Users API Called ===')
    
    // Check service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('Service key available:', !!serviceKey)
    console.log('Service key length:', serviceKey?.length || 0)

    // Step 1: Get all users from Supabase Auth
    console.log('Getting all auth users...')
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({ error: `Failed to fetch auth users: ${authError.message}` }, { status: 500 })
    }

    console.log(`Found ${authUsers.users.length} auth users`)

    // Step 2: Get all existing user_profiles
    console.log('Getting all user profiles...')
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      return NextResponse.json({ error: `Failed to fetch user profiles: ${profilesError.message}` }, { status: 500 })
    }

    console.log(`Found ${existingProfiles?.length || 0} existing user profiles`)

    // Step 3: Find orphaned users (auth users without profiles)
    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || [])
    const orphanedUsers = authUsers.users.filter(user => !existingProfileIds.has(user.id))

    console.log(`Found ${orphanedUsers.length} orphaned auth users`)

    if (orphanedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned users found',
        orphanedCount: 0,
        createdProfiles: [],
        errors: []
      })
    }

    // Step 4: Create user profiles for orphaned users
    const createdProfiles = []
    const errors = []

    for (let i = 0; i < orphanedUsers.length; i++) {
      const authUser = orphanedUsers[i]
      const email = authUser.email || ''
      
      console.log(`\n--- Processing orphaned user ${i + 1}/${orphanedUsers.length}: ${email} ---`)
      console.log(`Auth user ID: ${authUser.id}`)

      try {
        // Step 5: Create user profile with email-based mapping
        let profileData = {
          id: authUser.id,
          email: email,
          organisation_id: TEST_ORGANIZATION_ID,
          role: 'policyholder' as const,
          first_name: 'Unknown',
          surname: 'User'
        }

        // Apply specific mappings based on email
        if (email === 'admin@test.com') {
          profileData = {
            ...profileData,
            role: 'admin',
            first_name: 'System',
            surname: 'Administrator'
          }
        } else if (email === 'contractor@test.com') {
          profileData = {
            ...profileData,
            role: 'contractor',
            first_name: 'John',
            surname: 'Builder',
            // Add contractor-specific fields if they exist in your schema
            job_title: 'Lead Contractor',
            department: 'Construction',
            skills: ['construction', 'project_management', 'building_repairs']
          } as any
        } else if (email === 'surveyor@test.com') {
          profileData = {
            ...profileData,
            role: 'surveyor',
            first_name: 'Jane',
            surname: 'Inspector',
            // Add surveyor-specific fields if they exist in your schema
            job_title: 'Senior Surveyor',
            department: 'Assessment',
            skills: ['property_assessment', 'damage_evaluation', 'reporting']
          } as any
        } else if (email === 'policyholder@test.com') {
          profileData = {
            ...profileData,
            role: 'policyholder',
            first_name: 'Bob',
            surname: 'Smith'
          }
        } else {
          // For any other email, parse name from email and use policyholder role
          const emailName = email.split('@')[0]
          const nameParts = emailName.split(/[._-]/)
          
          if (nameParts.length >= 2) {
            profileData.first_name = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase()
            profileData.surname = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1).toLowerCase()
          } else if (nameParts.length === 1) {
            profileData.first_name = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase()
            profileData.surname = 'User'
          }
        }

        console.log('Creating profile with data:', JSON.stringify(profileData, null, 2))

        // Insert the user profile
        const { data: profile, error: insertError } = await supabaseAdmin
          .from('user_profiles')
          .insert(profileData)
          .select()
          .single()

        if (insertError) {
          console.error('Profile creation failed:', insertError)
          errors.push(`Profile creation failed for ${email}: ${insertError.message}`)
          continue
        }

        console.log('Profile created successfully:', profile.id)

        // Step 6: Link user to organization (if user_organisations table exists)
        try {
          console.log('Attempting to link user to organization...')
          const { error: linkError } = await supabaseAdmin
            .from('user_organisations')
            .insert({
              user_id: authUser.id,
              organisation_id: TEST_ORGANIZATION_ID,
              role: 'member'
            })

          if (linkError) {
            // If table doesn't exist or linking fails, log but don't fail the whole process
            console.log('Organization linking failed (this may be expected if table does not exist):', linkError.message)
          } else {
            console.log('User successfully linked to organization')
          }
        } catch (linkingError: any) {
          console.log('Organization linking attempt failed:', linkingError.message)
        }

        createdProfiles.push({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          first_name: profile.first_name,
          surname: profile.surname,
          organisation_id: profile.organisation_id
        })

      } catch (error: any) {
        console.error(`Unexpected error processing user ${email}:`, error)
        errors.push(`Unexpected error for ${email}: ${error.message}`)
      }
    }

    console.log(`\n=== Summary ===`)
    console.log(`Total orphaned users found: ${orphanedUsers.length}`)
    console.log(`Successfully created profiles: ${createdProfiles.length}`)
    console.log(`Errors encountered: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('Errors:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${createdProfiles.length} orphaned users`,
      orphanedCount: orphanedUsers.length,
      createdProfiles: createdProfiles,
      errors: errors,
      details: {
        totalAuthUsers: authUsers.users.length,
        existingProfiles: existingProfiles?.length || 0,
        orphanedUsersFound: orphanedUsers.length,
        successfullyCreated: createdProfiles.length,
        failedCreations: errors.length,
        testOrganizationId: TEST_ORGANIZATION_ID
      }
    })

  } catch (error: any) {
    console.error('Error fixing orphaned users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}