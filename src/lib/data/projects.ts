// lib/data/projects.ts
import { createClient } from '@/lib/supabaseClient';

interface Project {
  id: string;
  [key: string]: any;
}

interface Task {
  id: string;
  [key: string]: any;
}

export class ProjectService {
  static async getProject(id: string): Promise<Project | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (
          user_id,
          role,
          user_profiles (
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .single()
    
    return data
  }

  static async getProjectTasks(projectId: string): Promise<Task[]> {
    const supabase = createClient();
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:user_profiles!assigned_to (
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    return data || []
  }

  static async getProjectDocuments(projectId: string): Promise<Document[]> {
    const supabase = createClient();
    const { data } = await supabase
      .from('documents')
      .select(`
        *,
        uploaded_by:user_profiles (
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })
    
    return data || []
  }
}