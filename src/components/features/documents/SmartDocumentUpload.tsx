'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentUploadItem } from './DocumentUploadItem'
import { fetchAllowedDocumentTypes, suggestDocumentType } from '@/lib/documents'
import { useUserProfile } from '@/hooks/useUserProfile'
import { cn } from '@/lib/utils'

type FileWithSuggestion = {
  file: File
  suggestions: { type: string; confidence?: number }[]
  selectedType: string
}

type Props = {
  projectId: string
}

export const SmartDocumentUpload: React.FC<Props> = ({ projectId }) => {
  const { userProfile } = useUserProfile()
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileWithSuggestion[]>([])

  const { data: allowedTypes = [], isLoading } = useQuery({
    queryKey: ['allowed-document-types', userProfile?.role],
    queryFn: () => fetchAllowedDocumentTypes(userProfile?.role),
    enabled: !!userProfile?.role,
  })

  const handleDragEnter = () => setDragActive(true)
  const handleDragLeave = () => setDragActive(false)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
  }

  const processFiles = async (files: File[]) => {
    const filesWithSuggestions = await Promise.all(
      files.map(async (file) => {
        const suggestions = await suggestDocumentType(file.name)
        return {
          file,
          suggestions,
          selectedType: suggestions[0]?.type || 'other',
        }
      })
    )
    setSelectedFiles((prev) => [...prev, ...filesWithSuggestions])
  }

  const updateFileType = (index: number, newType: string) => {
    setSelectedFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selectedType: newType } : item))
    )
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    setSelectedFiles([])
  }

  const uploadFiles = async () => {
    try {
      // You would call your own upload handler here:
      // await uploadToSupabase(projectId, selectedFiles, userProfile.id)
      console.log("Uploading files:", selectedFiles)
    } catch (err) {
      console.error("Upload failed", err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <p className="text-sm text-muted-foreground">
          You can upload: {allowedTypes.map(t => t.display_name).join(', ')}
        </p>
      </CardHeader>

      <CardContent>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('document-upload-input')?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Drop files here or click to upload</p>
          <p className="text-xs text-gray-500">Supports: PDF, JPG, PNG, DOC, DOCX (max 50MB)</p>
          <input
            id="document-upload-input"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-4">
            {selectedFiles.map((fileItem, index) => (
              <DocumentUploadItem
                key={index}
                fileItem={fileItem}
                allowedTypes={allowedTypes}
                onTypeChange={(type) => updateFileType(index, type)}
                onRemove={() => removeFile(index)}
              />
            ))}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={clearFiles}>
                Clear All
              </Button>
              <Button onClick={uploadFiles}>
                Upload {selectedFiles.length} File(s)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
