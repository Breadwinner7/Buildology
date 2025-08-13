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
    console.log('=== Organization Cleanup API Called ===')
    
    // Find all organizations with name "Test Insurance Company" and type "insurer"
    const { data: duplicateOrgs, error: fetchError } = await supabaseAdmin
      .from('organisations')
      .select('id, name, type, created_at')
      .eq('name', 'Test Insurance Company')
      .eq('type', 'insurer')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching organizations:', fetchError)
      return NextResponse.json({ error: `Failed to fetch organizations: ${fetchError.message}` }, { status: 500 })
    }

    console.log(`Found ${duplicateOrgs?.length || 0} organizations matching criteria`)

    if (!duplicateOrgs || duplicateOrgs.length <= 1) {
      return NextResponse.json({
        success: true,
        message: 'No duplicates found to clean up',
        duplicatesFound: duplicateOrgs?.length || 0,
        deletedIds: [],
        keptId: duplicateOrgs?.[0]?.id || null,
        deletedCount: 0
      })
    }

    // Keep the oldest (first in the sorted array) and delete the rest
    const keepOrg = duplicateOrgs[0]
    const duplicatesToDelete = duplicateOrgs.slice(1)
    const idsToDelete = duplicatesToDelete.map(org => org.id)

    console.log(`Keeping organization ID: ${keepOrg.id} (created: ${keepOrg.created_at})`)
    console.log(`Deleting ${duplicatesToDelete.length} duplicates:`, idsToDelete)

    // Delete the duplicate organizations
    const { error: deleteError } = await supabaseAdmin
      .from('organisations')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      console.error('Error deleting organizations:', deleteError)
      return NextResponse.json({ error: `Failed to delete duplicates: ${deleteError.message}` }, { status: 500 })
    }

    console.log(`Successfully deleted ${duplicatesToDelete.length} duplicate organizations`)

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up duplicate organizations`,
      duplicatesFound: duplicateOrgs.length,
      deletedIds: idsToDelete,
      keptId: keepOrg.id,
      deletedCount: duplicatesToDelete.length,
      keptOrganization: {
        id: keepOrg.id,
        name: keepOrg.name,
        type: keepOrg.type,
        created_at: keepOrg.created_at
      }
    })

  } catch (error: any) {
    console.error('Error during organization cleanup:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}