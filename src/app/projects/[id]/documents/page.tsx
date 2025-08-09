import { notFound } from 'next/navigation'
import DocumentsModule from '@/components/features/documents/DocumentsModule'

interface Props {
  params: { id: string }
}

export default function ProjectDocumentsPage({ params }: Props) {
  const { id } = params

  // Ensure ID is valid (basic check)
  if (!id || id === 'undefined') return notFound()

  return <DocumentsModule projectId={id} />
}
