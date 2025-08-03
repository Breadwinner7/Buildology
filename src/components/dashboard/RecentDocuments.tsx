'use client'

import { FileText } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const DOCUMENTS = [
  { name: "ScopeOfWorks.pdf", uploader: "Sarah Client", uploadedAt: "2h ago", type: "PDF" },
  { name: "Kitchen_Tiles_Quote.jpg", uploader: "John Contractor", uploadedAt: "4h ago", type: "Image" },
  { name: "Floorplan_RevA.dwg", uploader: "Michael Surveyor", uploadedAt: "Yesterday", type: "CAD" },
]

export function RecentDocuments() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="text-md">Recent Documents</CardTitle>
        <Badge variant="outline" className="text-xs">{DOCUMENTS.length} Uploaded</Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {DOCUMENTS.map((doc, idx) => (
          <div key={idx} className="p-3 rounded-md border border-muted bg-muted/40 hover:bg-muted transition cursor-pointer">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium truncate">{doc.name}</p>
              </div>
              <span className="text-xs text-muted-foreground">{doc.uploadedAt}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Uploaded by <span className="font-medium">{doc.uploader}</span> • Type: {doc.type}
            </p>
          </div>
        ))}
      </CardContent>
      <div className="p-4 pt-2 mt-auto text-right">
        <Link href="/documents" className="text-sm font-medium text-primary hover:underline">
          View All Documents →
        </Link>
      </div>
    </Card>
  )
}
