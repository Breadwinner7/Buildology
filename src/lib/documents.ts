export async function fetchAllowedDocumentTypes(role: string | undefined) {
  if (!role) return []

  // Simulated backend logic — replace with real query later
  return [
    { type: 'invoice', display_name: 'Invoice' },
    { type: 'scope', display_name: 'Scope of Works' },
    { type: 'photo', display_name: 'Site Photos' },
    { type: 'other', display_name: 'Other' }
  ]
}

export async function suggestDocumentType(fileName: string) {
  const lower = fileName.toLowerCase()

  if (lower.includes('invoice')) return [{ type: 'invoice', display_name: 'Invoice' }]
  if (lower.includes('scope')) return [{ type: 'scope', display_name: 'Scope of Works' }]
  if (lower.includes('photo') || lower.match(/\.(jpg|jpeg|png)$/))
    return [{ type: 'photo', display_name: 'Site Photos' }]

  return [{ type: 'other', display_name: 'Other' }]
}
