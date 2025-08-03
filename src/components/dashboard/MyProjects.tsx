'use client'

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"

const PROJECTS = [
  { name: "Water Leak – 22 Elm Street", status: "In Progress", assignedBy: "Trinity Admin", region: "North" },
  { name: "Fire Reinstatement – Oak Lane", status: "On Survey", assignedBy: "Claims Team", region: "West" },
  { name: "Escape of Water – Flat 12", status: "Hold", assignedBy: "Jane Surveyor", region: "South" },
]

const statusColor = {
  "On Survey": "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Hold": "bg-red-100 text-red-800",
  "Completion": "bg-green-100 text-green-800",
  "Closed": "bg-gray-100 text-gray-800",
}

export function MyProjects() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="text-md">My Projects</CardTitle>
        <Badge variant="outline" className="text-xs">{PROJECTS.length} Active</Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {PROJECTS.map((proj, idx) => (
          <div
            key={idx}
            className="p-3 rounded-md border border-muted bg-muted/40 hover:bg-muted transition cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm truncate">{proj.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[proj.status]}`}>
                {proj.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assigned by <span className="font-medium">{proj.assignedBy}</span> • Region: {proj.region}
            </p>
          </div>
        ))}
      </CardContent>
      <div className="p-4 pt-2 mt-auto text-right">
        <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
          View All Projects →
        </Link>
      </div>
    </Card>
  )
}
