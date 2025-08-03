import { supabase } from "@/lib/supabaseClient"

export async function updateProjectDetails(projectId: string, updates: any) {
  return await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
}
