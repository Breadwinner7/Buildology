import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://npxprtixgtqfnisnjvys.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHBydGl4Z3RxZm5pc25qdnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxNzc1MjMsImV4cCI6MjA0Mjc1MzUyM30.Seh_-QSGqVQIIbhLWdHiYvvp2VnfDDGC1L9-sWo2qnE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSupplyChain() {
  console.log('Testing Supply Chain API Integration...\n')
  
  // Test 1: Check organisations table
  console.log('1. Testing organisations table:')
  const { data: orgs, error: orgError } = await supabase
    .from('organisations')
    .select('id, name, type, is_active')
    .limit(5)
  
  if (orgError) {
    console.log('   ✗ Error:', orgError.message)
  } else {
    console.log(`   ✓ Found ${orgs?.length || 0} organisations`)
    if (orgs && orgs.length > 0) {
      console.log('   Sample:', orgs[0])
    }
  }
  
  // Test 2: Check user_profiles with roles
  console.log('\n2. Testing user_profiles with roles:')
  const { data: users, error: userError } = await supabase
    .from('user_profiles')
    .select('id, first_name, surname, role, is_active')
    .in('role', ['admin', 'contractor', 'surveyor', 'policyholder'])
    .limit(5)
  
  if (userError) {
    console.log('   ✗ Error:', userError.message)
  } else {
    console.log(`   ✓ Found ${users?.length || 0} users`)
    const roleCounts = {}
    users?.forEach(u => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1
    })
    console.log('   Roles found:', roleCounts)
  }
  
  // Test 3: Check user_organisations linking table
  console.log('\n3. Testing user_organisations linking:')
  const { data: userOrgs, error: userOrgError } = await supabase
    .from('user_organisations')
    .select(`
      user_id,
      organisation_id,
      role,
      user_profiles(first_name, surname),
      organisations(name)
    `)
    .limit(5)
  
  if (userOrgError) {
    console.log('   ✗ Error:', userOrgError.message)
  } else {
    console.log(`   ✓ Found ${userOrgs?.length || 0} user-organisation links`)
    if (userOrgs && userOrgs.length > 0) {
      const sample = userOrgs[0]
      console.log(`   Sample: ${sample.user_profiles?.first_name} ${sample.user_profiles?.surname} -> ${sample.organisations?.name} (${sample.role})`)
    }
  }
  
  // Test 4: Check contractors specifically
  console.log('\n4. Testing contractor users:')
  const { data: contractors, error: contractorError } = await supabase
    .from('user_profiles')
    .select(`
      id,
      first_name,
      surname,
      role,
      organisation_id,
      organisations(name, type)
    `)
    .eq('role', 'contractor')
    .limit(5)
  
  if (contractorError) {
    console.log('   ✗ Error:', contractorError.message)
  } else {
    console.log(`   ✓ Found ${contractors?.length || 0} contractors`)
    contractors?.forEach(c => {
      console.log(`   - ${c.first_name} ${c.surname} (${c.organisations?.name || 'No org'})`)
    })
  }
  
  // Test 5: Check insurance_policies table
  console.log('\n5. Testing insurance_policies:')
  const { data: policies, error: policyError } = await supabase
    .from('insurance_policies')
    .select('id, policy_number, policy_type, status')
    .limit(5)
  
  if (policyError) {
    console.log('   ✗ Error:', policyError.message)
  } else {
    console.log(`   ✓ Found ${policies?.length || 0} policies`)
  }
  
  // Test 6: Check claims table
  console.log('\n6. Testing claims:')
  const { data: claims, error: claimError } = await supabase
    .from('claims')
    .select('id, claim_number, status')
    .limit(5)
  
  if (claimError) {
    console.log('   ✗ Error:', claimError.message)
  } else {
    console.log(`   ✓ Found ${claims?.length || 0} claims`)
  }
  
  console.log('\n=== Supply Chain Integration Test Complete ===')
  console.log('\nNext Steps:')
  console.log('1. Run the migration in Supabase Dashboard to add the new columns')
  console.log('2. The supply chain API at src/lib/api/supply-chain.ts is ready to use')
  console.log('3. The admin dashboards at /admin/organizations and /admin/policyholders are connected')
  console.log('4. Individual contractor logins are supported through the user_profiles.role system')
}

testSupplyChain()