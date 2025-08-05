import { ReactNode } from "react"
import { ProjectSidebar } from "@/components/features/projects/ProjectSidebar"

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {children}
      </main>
    </div>
  )
}
