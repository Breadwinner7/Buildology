'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestUserProfiles() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testQuery = async () => {
    setLoading(true)
    try {
      console.log('Testing user_profiles table access...')
      
      // Test 1: Simple count
      const { count, error: countError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
      
      console.log('Count query:', { count, error: countError })
      
      // Test 2: Simple select
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(5)
      
      console.log('Select query:', { dataLength: data?.length, error })
      
      setResult({
        count,
        countError: countError ? JSON.stringify(countError) : null,
        data: data ? data.slice(0, 3) : null, // Show first 3 records
        selectError: error ? JSON.stringify(error) : null
      })
      
    } catch (err) {
      console.error('Test error:', err)
      setResult({ error: JSON.stringify(err) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testQuery()
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Profiles Table Test</CardTitle>
          </CardHeader>
          <CardContent>
            <button 
              onClick={testQuery}
              disabled={loading}
              className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Again'}
            </button>
            
            <pre className="bg-muted p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}