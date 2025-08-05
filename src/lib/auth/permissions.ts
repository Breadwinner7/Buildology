// lib/auth/permissions.ts
export interface ProjectAccess {
  projectId: string
  userId: string
  role: 'admin' | 'surveyor' | 'contractor' | 'handler' | 'client'
  permissions: string[]
}

export async function checkProjectAccess(
  projectId: string, 
  userId: string
): Promise<ProjectAccess | null> {
  const { data } = await supabase
    .from('project_members')
    .select('role, permissions')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  
  return data
}