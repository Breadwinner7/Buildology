'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const projectStatuses = [
  { label: 'On Survey', count: 3, color: 'bg-blue-500' },
  { label: 'In Progress', count: 8, color: 'bg-yellow-500' },
  { label: 'On Hold', count: 2, color: 'bg-red-500' },
  { label: 'Completion', count: 5, color: 'bg-green-500' },
  { label: 'Closed', count: 1, color: 'bg-gray-400' },
]

export default function ProjectStatusCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projectStatuses.map((status) => (
        <Card key={status.label}>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-md font-medium">{status.label}</CardTitle>
            <Badge className={`${status.color} text-white`}>{status.count}</Badge>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
