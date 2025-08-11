import { notFound } from 'next/navigation'
import DocumentsModule from '@/components/features/documents/DocumentsModule'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDocumentsPage({ params }: Props) {
  const { id } = await params

  // Ensure ID is valid (basic check)
  if (!id || id === 'undefined') return notFound()

  return (
    <div className="p-6 space-y-6">
      <DocumentsModule projectId={id} />
    </div>
  )
}
