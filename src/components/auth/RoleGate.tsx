'use client'

import { useRole } from '@/hooks/useRole'

export function RoleGate({
  allowed,
  children,
}: {
  allowed: string[]
  children: React.ReactNode
}) {
  const role = useRole()

  if (!role) return null
  if (!allowed.includes(role)) return null

  return <>{children}</>
}
