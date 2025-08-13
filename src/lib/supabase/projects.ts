import { supabase } from "@/lib/supabaseClient"

export async function updateProjectDetails(projectId: string, updates: any) {
  console.log('=== DATABASE UPDATE ===')
  console.log('Project ID:', projectId)
  console.log('Updates:', updates)
  
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      throw new Error('Authentication required')
    }
    console.log('Session valid:', session.user.email)
    
    const result = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select() // Return the updated data
    
    console.log('Database result:', result)
    return result
    
  } catch (error) {
    console.error('Database update error:', error)
    return { error, data: null }
  }
}
