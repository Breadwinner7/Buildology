'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CircleAlert,
  CalendarClock,
  CalendarDays,
  ChevronRight,
} from 'lucide-react'

const TASK_CARDS = [
  {
    title: 'Overdue',
    count: 4,
    icon: <CircleAlert className="h-5 w-5 text-red-800" />,
    bg: 'bg-red-400 text-white',
  },
  {
    title: 'Due Today',
    count: 3,
    icon: <CalendarClock className="h-5 w-5 text-yellow-900" />,
    bg: 'bg-yellow-300 text-black',
  },
  {
    title: 'Due This Week',
    count: 7,
    icon: <CalendarDays className="h-5 w-5 text-blue-900" />,
    bg: 'bg-blue-400 text-white',
  },
]

const RECENT_TASKS = [
  {
    title: 'Survey return overdue – Flat 12',
    due: 'Yesterday',
  },
  {
    title: 'Call policyholder – Elm Street',
    due: 'Today',
  },
  {
    title: 'Upload drying certs – New Lane',
    due: 'Today',
  },
  {
    title: 'Reinspection due – Brookside Ave',
    due: 'This Week',
  },
]

export function TaskSummary() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-md">Task Summary</CardTitle>
        <Link href="/tasks" className="text-sm text-primary hover:underline">
          View All →
        </Link>
      </CardHeader>

      {/* KPI Cards */}
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {TASK_CARDS.map((task) => (
          <div
            key={task.title}
            className={`p-4 rounded-md ${task.bg} flex flex-col hover:scale-[1.01] transition-transform`}
          >
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-semibold">{task.title}</h4>
              {task.icon}
            </div>
            <div className="text-2xl font-bold">{task.count}</div>
            <p className="text-xs mt-1 opacity-90">
              tasks {task.title.toLowerCase()}
            </p>
          </div>
        ))}
      </CardContent>

      {/* Divider */}
      <hr className="my-2 border-muted" />

      {/* Recent Tasks Section */}
      <CardContent className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Recent Tasks
        </h4>
        <ul className="space-y-1 text-sm">
          {RECENT_TASKS.map((task, index) => (
            <li
              key={index}
              className="flex justify-between items-center bg-muted/40 rounded-md p-2 hover:bg-muted transition"
            >
              <span className="truncate">{task.title}</span>
              <span className="text-xs text-muted-foreground">{task.due}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-right">
          <Link
            href="/tasks"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            View All Tasks <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
