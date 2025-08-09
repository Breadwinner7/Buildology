const fetchDocuments = async () => {
  console.log('🔍 Starting fetchDocuments for projectId:', projectId)

  if (!projectId || projectId === 'undefined') {
    console.error('❌ Invalid projectId:', projectId)
    toast({
      title: "Error",
      description: "Invalid project ID",
      variant: "destructive",
    })
    return
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to view documents",
        variant: "destructive",
      })
      return
    }

    // ✅ Join only on user_profiles (NOT project_members to avoid recursion)
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploader:user_profiles!documents_user_id_fkey (
          id,
          email,
          first_name,
          surname,
          preferred_name
        ),
        approver:user_profiles!documents_approved_by_fkey (
          id,
          email,
          first_name,
          surname
        ),
        sharer:user_profiles!documents_shared_by_fkey (
          id,
          email,
          first_name,
          surname
        )
      `)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })

    console.log('📄 Query result:', { dataCount: data?.length, error })

    if (error) {
      console.warn('❌ Join query failed, trying fallback:', error.message)

      // Fallback to non-joined data
      const { data: simpleData, error: simpleError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (simpleError) throw simpleError

      setDocuments(simpleData || [])
      toast({
        title: "Partial Success",
        description: "Documents loaded without user info",
      })
    } else {
      setDocuments(data || [])
    }

  } catch (error: any) {
    console.error('💥 Unexpected error:', error)
    toast({
      title: "Error",
      description: error.message || "Unexpected error occurred",
      variant: "destructive",
    })
  }
}
