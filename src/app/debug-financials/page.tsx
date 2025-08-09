'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Simple debug component to test the connection
export default function DebugFinancials() {
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const projectId = '59d4245a-5b48-4269-8b14-419b03f8a69a'

  useEffect(() => {
    async function testQueries() {
      console.log('🔍 Testing Supabase connection...')
      
      try {
        // Test 1: Basic connection
        console.log('Test 1: Basic Supabase connection')
        const { data: testData, error: testError } = await supabase
          .from('projects')
          .select('id, name')
          .limit(1)
        
        console.log('Projects test:', { testData, testError })

        // Test 2: Check if our project exists
        console.log('Test 2: Check if our project exists')
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()
        
        console.log('Our project:', { projectData, projectError })

        // Test 3: Check project_financials table
        console.log('Test 3: Check project_financials table')
        const { data: financialData, error: financialError } = await supabase
          .from('project_financials')
          .select('*')
          .eq('project_id', projectId)
        
        console.log('Financial data:', { financialData, financialError })

        // Test 4: Check if table exists at all
        console.log('Test 4: Check all financial records')
        const { data: allFinancials, error: allError } = await supabase
          .from('project_financials')
          .select('*')
          .limit(5)
        
        console.log('All financials:', { allFinancials, allError })

        setResults({
          projectExists: !!projectData,
          projectData,
          financialData,
          allFinancials,
          errors: {
            projectError,
            financialError,
            allError
          }
        })

      } catch (err) {
        console.error('💥 Error in test queries:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    testQueries()
  }, [projectId])

  if (loading) {
    return <div className="p-4">🔍 Testing database connection...</div>
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded">
        <h3 className="font-bold text-red-800">Connection Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🔍 Database Connection Debug</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Status */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Project Status</h3>
          {results?.projectExists ? (
            <div className="text-green-600">
              ✅ Project found: {results.projectData?.name}
            </div>
          ) : (
            <div className="text-red-600">
              ❌ Project not found
            </div>
          )}
        </div>

        {/* Financial Data Status */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Financial Data Status</h3>
          {results?.financialData && results.financialData.length > 0 ? (
            <div className="text-green-600">
              ✅ Financial data found
              <br />
              Budget: £{results.financialData[0]?.budget_total?.toLocaleString()}
            </div>
          ) : (
            <div className="text-red-600">
              ❌ No financial data found
            </div>
          )}
        </div>
      </div>

      {/* Raw Data */}
      <div className="border p-4 rounded bg-gray-50">
        <h3 className="font-semibold mb-2">Raw Data</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>

      {/* Test Links */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Test Links</h3>
        <div className="space-y-2">
          <a 
            href={`/projects/${projectId}`}
            className="block text-blue-600 hover:underline"
          >
            📋 Project Overview Page
          </a>
          <a 
            href={`/projects/${projectId}/financials`}
            className="block text-blue-600 hover:underline"
          >
            💰 Financial Page (might error)
          </a>
        </div>
      </div>
    </div>
  )
}