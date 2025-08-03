'use client'

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const MESSAGES = [
  { threadTitle: "Kitchen Ceiling Issue", sender: "John Doe", lastMessage: "Uploaded site photos.", time: "1h ago", unreadCount: 2 },
  { threadTitle: "Quote Approval", sender: "Sarah Client", lastMessage: "Can we reduce tile costs?", time: "3h ago", unreadCount: 1 },
  { threadTitle: "Access Arrangements", sender: "Tom Site Lead", lastMessage: "No access Friday.", time: "Yesterday", unreadCount: 3 },
]

export function UnreadMessages() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="text-md">Unread Messages</CardTitle>
        <Badge variant="outline" className="text-xs">{MESSAGES.length} Threads</Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {MESSAGES.map((msg, idx) => (
          <div key={idx} className="p-3 rounded-md border border-muted bg-muted/40 hover:bg-muted transition cursor-pointer">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm truncate">{msg.threadTitle}</h3>
              <span className="text-xs text-muted-foreground">{msg.time}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium">{msg.sender}</span>: {msg.lastMessage}
            </p>
            <div className="mt-1">
              <Badge className="text-xs bg-blue-500 hover:bg-blue-600">{msg.unreadCount} unread</Badge>
            </div>
          </div>
        ))}
      </CardContent>
      <div className="p-4 pt-2 mt-auto text-right">
        <Link href="/messages" className="text-sm font-medium text-primary hover:underline">
          View All Messages →
        </Link>
      </div>
    </Card>
  )
}
