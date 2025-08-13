import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
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

export async function POST(request: Request) {
  try {
    console.log('=== User Creation API Called ===')
    
    const body = await request.json()
    const { users, organization } = body
    
    console.log('Request body:', JSON.stringify({ users: users.length, organization: !!organization }, null, 2))
    
    // Check service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('Service key available:', !!serviceKey)
    console.log('Service key length:', serviceKey?.length || 0)

    // Create organization if provided
    let orgId = null
    if (organization) {
      console.log('Creating organization:', organization.name)
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organisations')
        .insert(organization)
        .select()
        .single()

      if (orgError) {
        console.error('Org error:', orgError)
        return NextResponse.json({ error: `Organization creation failed: ${orgError.message}` }, { status: 400 })
      }
      orgId = org.id
      console.log('Organization created with ID:', orgId)
    }

    // Create users
    const createdUsers = []
    const errors = []
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      console.log(`\n--- Creating user ${i + 1}/${users.length}: ${user.email} ---`)
      
      // Create auth user
      console.log('Creating auth user...')
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        console.error('Auth error:', authError)
        errors.push(`Auth failed for ${user.email}: ${authError.message}`)
        continue
      }
      
      console.log('Auth user created:', authUser.user.id)
      
      // Verify auth user exists by checking if we can retrieve it
      const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(authUser.user.id)
      if (verifyError || !verifyUser.user) {
        console.error('Auth user verification failed:', verifyError)
        errors.push(`Auth verification failed for ${user.email}: ${verifyError?.message || 'User not found'}`)
        continue
      }
      console.log('Auth user verified successfully')

      // Create user profile
      console.log('Creating user profile...')
      const profileData = {
        id: authUser.user.id,
        email: user.email,
        first_name: user.first_name,
        surname: user.surname,
        role: user.role,
        organisation_id: orgId || user.organisation_id,
        ...user.additional_fields
      }
      
      console.log('Profile data:', JSON.stringify(profileData, null, 2))
      
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        errors.push(`Profile failed for ${user.email}: ${profileError.message}`)
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        continue
      }
      
      console.log('Profile created successfully')
      createdUsers.push(profile)

      // Link to organization if needed
      if (orgId) {
        console.log('Linking user to organization...')
        const { error: linkError } = await supabaseAdmin
          .from('user_organisations')
          .insert({
            user_id: authUser.user.id,
            organisation_id: orgId,
            role: user.org_role || 'member'
          })
          
        if (linkError) {
          console.error('Link error:', linkError)
          errors.push(`Organization link failed for ${user.email}: ${linkError.message}`)
        } else {
          console.log('User linked to organization')
        }
      }
    }

    console.log(`\n=== Summary ===`)
    console.log(`Created users: ${createdUsers.length}`)
    console.log(`Errors: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('Errors:', errors)
    }

    return NextResponse.json({
      success: true,
      users: createdUsers,
      organization: orgId,
      errors: errors
    })

  } catch (error: any) {
    console.error('Error creating users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}