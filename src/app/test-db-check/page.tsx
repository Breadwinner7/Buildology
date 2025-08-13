'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Organisation {
  id: string
  name: string
  type: string
  company_number?: string
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  first_name: string
  surname: string
  role: string
  organisation_id?: string
  created_at: string
}

interface UserOrganisation {
  user_id: string
  organisation_id: string
  role: string
}

interface DatabaseData {
  organisations: Organisation[]
  userProfiles: UserProfile[]
  userOrganisations: UserOrganisation[]
  loading: boolean
  error: string | null
}

export default function TestDbCheck() {
  const [data, setData] = useState<DatabaseData>({
    organisations: [],
    userProfiles: [],
    userOrganisations: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      try {
        setData(prev => ({ ...prev, loading: true, error: null }))

        // Query organisations table
        const { data: orgs, error: orgsError } = await supabase
          .from('organisations')
          .select('id, name, type, company_number, created_at')
          .order('created_at', { ascending: false })

        if (orgsError) {
          console.error('Organisations query error:', orgsError)
          throw new Error(`Organisations: ${orgsError.message}`)
        }

        // Query user_profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, email, first_name, surname, role, organisation_id, created_at')
          .order('created_at', { ascending: false })

        if (profilesError) {
          console.error('User profiles query error:', profilesError)
          throw new Error(`User profiles: ${profilesError.message}`)
        }

        // Query user_organisations table
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from('user_organisations')
          .select('user_id, organisation_id, role')

        if (userOrgsError) {
          console.error('User organisations query error:', userOrgsError)
          throw new Error(`User organisations: ${userOrgsError.message}`)
        }

        setData({
          organisations: orgs || [],
          userProfiles: profiles || [],
          userOrganisations: userOrgs || [],
          loading: false,
          error: null
        })

      } catch (error: any) {
        console.error('Database fetch error:', error)
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }))
      }
    }

    fetchData()
  }, [])

  if (data.loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading database data...</p>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Database Error</h2>
          <p className="text-red-600">{data.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Database Test Check</h1>
          <p className="text-muted-foreground">Current database contents for troubleshooting user creation</p>
        </div>

        <div className="grid gap-8">
          {/* Organisations Table */}
          <div className="bg-background rounded-lg shadow">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                Organisations ({data.organisations.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {data.organisations.length > 0 ? (
                    data.organisations.map((org) => (
                      <tr key={org.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">{org.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{org.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{org.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{org.company_number || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(org.created_at).toLocaleDateString()} {new Date(org.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">No organisations found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Profiles Table */}
          <div className="bg-background rounded-lg shadow">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                User Profiles ({data.userProfiles.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organisation ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {data.userProfiles.length > 0 ? (
                    data.userProfiles.map((profile) => (
                      <tr key={profile.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">{profile.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{profile.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {profile.first_name} {profile.surname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{profile.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                          {profile.organisation_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()} {new Date(profile.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">No user profiles found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Organisations Table */}
          <div className="bg-background rounded-lg shadow">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                User Organisations ({data.userOrganisations.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organisation ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {data.userOrganisations.length > 0 ? (
                    data.userOrganisations.map((userOrg, index) => (
                      <tr key={`${userOrg.user_id}-${userOrg.organisation_id}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">{userOrg.user_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">{userOrg.organisation_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{userOrg.role}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">No user organisation links found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.organisations.length}</div>
                <div className="text-sm text-blue-800">Organisations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.userProfiles.length}</div>
                <div className="text-sm text-blue-800">User Profiles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.userOrganisations.length}</div>
                <div className="text-sm text-blue-800">User-Organisation Links</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}