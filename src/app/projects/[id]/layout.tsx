import { ReactNode } from "react"
import { ProjectSidebar } from "@/components/features/projects/ProjectSidebar"

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      {/* Project-specific sidebar for navigating within a project */}
      <ProjectSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
