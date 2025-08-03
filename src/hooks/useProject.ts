'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'


export function useProject(projectId: string) {
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  
  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error loading project:', error)
      } else {
        setProject(data)
      }
      setLoading(false)
    }

    if (projectId) fetchProject()
  }, [projectId])

  return { project, loading, setProject }
}

