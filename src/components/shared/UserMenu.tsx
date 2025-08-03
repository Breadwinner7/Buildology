'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

export function UserMenu() {
  const { user } = useUser()
  const router = useRouter()

  if (!user) return null

  const initials = user.full_name?.slice(0, 2).toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          localStorage.clear()
          router.push('/login')
        }}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
