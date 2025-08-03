'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  content: string
  pinned: boolean
  created_at: string
}

export default function NotesModule({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setNotes(data)
    }

    fetchNotes()
  }, [projectId])

  const addNote = async () => {
    if (!newNote.trim()) return
    const { data, error } = await supabase
      .from('notes')
      .insert([{ content: newNote, project_id: projectId }])
      .select()
      .single()

    if (error) console.error(error)
    else {
      setNotes([data, ...notes])
      setNewNote('')
    }
  }

  const togglePin = async (noteId: string, current: boolean) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ pinned: !current })
      .eq('id', noteId)
      .select()
      .single()

    if (error) console.error(error)
    else {
      setNotes(notes.map(n => (n.id === noteId ? data : n)))
    }
  }

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h2 className="text-lg font-semibold">📝 Notes</h2>

      <div className="space-y-2">
        <Textarea
          placeholder="Write a new note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <Button onClick={addNote}>Add Note</Button>
      </div>

      <ul className="space-y-2">
        {notes.map(note => (
          <li
            key={note.id}
            className={cn(
              "p-3 border rounded",
              note.pinned && "border-yellow-500 bg-yellow-50"
            )}
          >
            <div className="flex justify-between items-center">
              <span className="whitespace-pre-wrap">{note.content}</span>
              <Button
                variant="outline"
                onClick={() => togglePin(note.id, note.pinned)}
              >
                {note.pinned ? 'Unpin' : 'Pin'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
