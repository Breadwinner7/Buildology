import { AdminUsersTable } from '@/components/admin/AdminUsersTable'

export default function UsersAdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">User Management</h1>
      <AdminUsersTable />
    </div>
  )
}
