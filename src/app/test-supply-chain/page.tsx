'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, Users, Building, UserCheck, Database } from 'lucide-react'
import { getSupplyChainStats, getOrganisations, getContractors, getSurveyors, getCustomers } from '@/lib/api/supply-chain'

export default function TestSupplyChain() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const results = []

    // Test 1: Get Supply Chain Stats
    try {
      const statsData = await getSupplyChainStats()
      setStats(statsData)
      results.push({
        name: 'Supply Chain Statistics',
        status: 'success',
        message: `Found ${statsData.totalOrganisations} organisations, ${statsData.totalUsers} users`,
        data: statsData
      })
    } catch (error: any) {
      results.push({
        name: 'Supply Chain Statistics',
        status: 'error',
        message: error.message
      })
    }

    // Test 2: Get Organisations
    try {
      const { organisations, total } = await getOrganisations({ limit: 5 })
      results.push({
        name: 'Organisations',
        status: 'success',
        message: `Found ${total} organisations`,
        data: organisations
      })
    } catch (error: any) {
      results.push({
        name: 'Organisations',
        status: 'error',
        message: error.message
      })
    }

    // Test 3: Get Contractors
    try {
      const { contractors, total } = await getContractors({ limit: 5 })
      results.push({
        name: 'Contractors',
        status: 'success',
        message: `Found ${total} contractors`,
        data: contractors
      })
    } catch (error: any) {
      results.push({
        name: 'Contractors',
        status: 'error',
        message: error.message
      })
    }

    // Test 4: Get Surveyors
    try {
      const { surveyors, total } = await getSurveyors({ limit: 5 })
      results.push({
        name: 'Surveyors',
        status: 'success',
        message: `Found ${total} surveyors`,
        data: surveyors
      })
    } catch (error: any) {
      results.push({
        name: 'Surveyors',
        status: 'error',
        message: error.message
      })
    }

    // Test 5: Get Customers
    try {
      const { customers, total } = await getCustomers({ limit: 5 })
      results.push({
        name: 'Customers/Policyholders',
        status: 'success',
        message: `Found ${total} customers`,
        data: customers
      })
    } catch (error: any) {
      results.push({
        name: 'Customers/Policyholders',
        status: 'error',
        message: error.message
      })
    }

    setTestResults(results)
    setLoading(false)
  }

  useEffect(() => {
    runTests()
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supply Chain Integration Test</h1>
          <p className="text-muted-foreground mt-1">Testing database integration and API endpoints</p>
        </div>
        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Running Tests...' : 'Re-run Tests'}
        </Button>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organisations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganisations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.contractors.organisations} contractor firms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Active across all roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contractors</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contractors.individuals}</div>
              <p className="text-xs text-muted-foreground">
                {stats.contractors.available} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customers.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.customers.newThisMonth} new this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>API Test Results</CardTitle>
          <CardDescription>Testing supply chain API endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : result.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span className="font-semibold">{result.name}</span>
                </div>
                <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                  {result.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                    View Data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary Alert */}
      {testResults.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Summary:</strong>{' '}
            {testResults.filter(r => r.status === 'success').length} of {testResults.length} tests passed.
            {testResults.every(r => r.status === 'success') ? (
              <span className="text-green-600 ml-2">✓ All systems operational</span>
            ) : (
              <span className="text-yellow-600 ml-2">Some tests need attention</span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}