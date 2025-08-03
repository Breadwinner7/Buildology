'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export function KpiGrid() {
  const statuses = [
    { label: 'On Survey', count: 3, bg: 'bg-yellow-300 text-yellow-900' },
    { label: 'In Progress', count: 6, bg: 'bg-blue-400 text-blue-900' },
    { label: 'On Hold', count: 2, bg: 'bg-red-400 text-red-100' },
    { label: 'Complete', count: 4, bg: 'bg-green-400 text-green-900' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statuses.map((status) => (
        <Link key={status.label} href={`/projects?status=${status.label}`} passHref>
          <Card
            className={`${status.bg} hover:scale-[1.02] transition-transform shadow-md cursor-pointer`}
          >
            <CardHeader>
              <CardTitle className="text-sm">{status.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{status.count}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
