import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { apiBaseUrl, uploadBaseUrl } from '@/constants/api'

type Resource = 'fotografiePhotos' | 'gardenPhotos' | 'certificates' | 'projects' | 'schwerpunkte' | 'blog'
type Entry = Record<string, string>
type Field = { key: string; label: string; required?: boolean; multiline?: boolean; max: number }
type Props = { accessToken: string; tokenExpiresAt: number | null; onSessionExpired: () => void }

const resources: { id: Resource; label: string; fields: Field[] }[] = [
  { id: 'fotografiePhotos', label: 'Fotografie', fields: [
    { key: 'name', label: 'Dateiname', required: true, max: 100 },
    { key: 'title', label: 'Titel', required: true, max: 200 },
    { key: 'description', label: 'Beschreibung', multiline: true, max: 2000 },
    { key: 'sub_category', label: 'Unterkategorie', required: true, max: 100 },
    { key: 'src', label: 'Bildpfad', required: true, max: 250 },
  ] },
  { id: 'gardenPhotos', label: 'Gartenfotos', fields: [
    { key: 'name', label: 'Dateiname', required: true, max: 100 },
    { key: 'title', label: 'Titel', required: true, max: 200 },
    { key: 'description', label: 'Beschreibung', multiline: true, max: 2000 },
    { key: 'sub_category', label: 'Unterkategorie', required: true, max: 100 },
    { key: 'src', label: 'Bildpfad', required: true, max: 250 },
  ] },
  { id: 'certificates', label: 'Zertifikate', fields: [
    { key: 'name', label: 'Name', required: true, max: 200 },
    { key: 'issuer', label: 'Aussteller', max: 200 },
    { key: 'img', label: 'Bildpfad', required: true, max: 250 },
  ] },
  { id: 'blog', label: 'Blogbeiträge', fields: [
    { key: 'title', label: 'Titel', required: true, max: 120 },
    { key: 'summary', label: 'Kurzbeschreibung', required: true, multiline: true, max: 300 },
    { key: 'body', label: 'Markdown-Inhalt', required: true, multiline: true, max: 50000 },
  ] },
  { id: 'projects', label: 'Projekte', fields: [
    { key: 'name', label: 'Name', required: true, max: 200 },
    { key: 'description', label: 'Beschreibung', multiline: true, max: 2000 },
    { key: 'demoUrl', label: 'Demo-URL', max: 500 },
    { key: 'repoUrl', label: 'Repository-URL', max: 500 },
  ] },
  { id: 'schwerpunkte', label: 'Technische Schwerpunkte', fields: [
    { key: 'text', label: 'Schwerpunkt', required: true, max: 500 },
  ] },
]

const apiError = async (response: Response) => {
  const payload = await response.json().catch(() => ({})) as { error?: string }
  return payload.error || `HTTP ${response.status}`
}
const assetUrl = (path: string) => `${import.meta.env.BASE_URL || '/'}${path.replace(/^\//, '')}`

export default function AdminContentManager({ accessToken, tokenExpiresAt, onSessionExpired }: Props) {
  const [resource, setResource] = useState<Resource>('fotografiePhotos')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<Entry>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const definition = resources.find((item) => item.id === resource)!
  const imageField = resource === 'certificates' ? 'img' : resource === 'fotografiePhotos' || resource === 'gardenPhotos' ? 'src' : null

  useEffect(() => {
    if (!apiBaseUrl) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`${apiBaseUrl}/${resource}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await apiError(response))
        return response.json() as Promise<Entry[]>
      })
      .then((items) => setEntries(items))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Laden fehlgeschlagen')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [resource, revision])

  const changeResource = (next: Resource) => {
    setResource(next)
    setSelected(null)
    setForm({})
    setEntries([])
    setNotice('')
  }

  const choose = (entry: Entry) => {
    setSelected(entry.id || entry.slug)
    setForm({ ...entry })
    setError('')
    setNotice('')
  }

  const ensureSession = () => {
    if (!accessToken || !tokenExpiresAt || tokenExpiresAt - Date.now() <= 10_000) {
      onSessionExpired()
      return false
    }
    return true
  }

  const upload = async (file: File) => {
    if (!imageField || !uploadBaseUrl || !ensureSession()) return
    setSaving(true)
    setError('')
    try {
      const data = new FormData()
      data.append('image', file)
      data.append('name', file.name.replace(/\.[^.]+$/, ''))
      data.append('category', resource === 'certificates' ? 'certificates' : resource === 'gardenPhotos' ? 'garten' : 'foto')
      const response = await fetch(`${uploadBaseUrl}/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: data,
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) throw new Error(await apiError(response))
      const result = await response.json() as { src: string }
      setForm((current) => ({ ...current, [imageField]: result.src,
        ...(!current.name && resource !== 'certificates' ? { name: file.name.replace(/\.[^.]+$/, '') } : {}) }))
      setNotice('Bild hochgeladen. Eintrag zum Übernehmen speichern.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bild-Upload fehlgeschlagen')
    } finally { setSaving(false) }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!apiBaseUrl || !ensureSession()) return
    const payload: Entry = {}
    for (const field of definition.fields) {
      const value = (form[field.key] || '').trim()
      if (value) payload[field.key] = value
    }
    if (resource === 'fotografiePhotos') payload.category = 'foto'
    if (resource === 'gardenPhotos') payload.category = selected && form.category ? form.category : 'garten'
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const url = `${apiBaseUrl}/${resource}${selected ? `/${encodeURIComponent(selected)}` : ''}`
      const response = await fetch(url, {
        method: selected ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) throw new Error(await apiError(response))
      const result = await response.json() as { item?: Entry; post?: Entry }
      const saved = result.item || result.post
      if (saved) setEntries((current) => selected
        ? current.map((entry) => (entry.id || entry.slug) === selected ? saved : entry)
        : [...current, saved])
      setSelected(null)
      setForm({})
      setRevision((value) => value + 1)
      setNotice('Eintrag gespeichert. Die öffentliche Website benötigt einen neuen Build und ein Deployment.')
      if (resource === 'certificates') window.dispatchEvent(new Event('certificates:updated'))
      if (resource === 'fotografiePhotos' || resource === 'gardenPhotos') window.dispatchEvent(new Event('photos:updated'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!selected || !apiBaseUrl || !ensureSession()) return
    if (!window.confirm('Diesen Eintrag wirklich löschen? Die Bilddatei bleibt erhalten.')) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`${apiBaseUrl}/${resource}/${encodeURIComponent(selected)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) throw new Error(await apiError(response))
      setEntries((current) => current.filter((entry) => (entry.id || entry.slug) !== selected))
      setSelected(null)
      setForm({})
      setRevision((value) => value + 1)
      setNotice('Eintrag gelöscht. Die öffentliche Website benötigt einen neuen Build und ein Deployment.')
      if (resource === 'certificates') window.dispatchEvent(new Event('certificates:updated'))
      if (resource === 'fotografiePhotos' || resource === 'gardenPhotos') window.dispatchEvent(new Event('photos:updated'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Löschen fehlgeschlagen')
    } finally { setSaving(false) }
  }

  return (
    <Box className="admin-form-card" sx={{ p: 3, color: '#fff' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Inhalte verwalten</Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#cbd5e1' }}>
        Änderungen werden lokal gespeichert. Für GitHub Pages anschließend Build und Deployment ausführen.
      </Typography>
      {!apiBaseUrl && <Alert severity="warning" sx={{ mb: 2 }}>API nicht konfiguriert. Lokal mit npm run dev starten.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      <TextField select label="Bereich" value={resource} onChange={(event) => changeResource(event.target.value as Resource)}
        fullWidth sx={{ mb: 3, '& .MuiInputBase-root, & .MuiInputLabel-root': { color: '#fff' } }}>
        {resources.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
      </TextField>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) minmax(300px, 2fr)' }, gap: 3 }}>
        <Box>
          <Button variant="contained" onClick={() => { setSelected(null); setForm({}); setError(''); setNotice('') }} sx={{ mb: 2 }}>
            Neuer Eintrag
          </Button>
          <Typography variant="body2" sx={{ mb: 1, color: '#cbd5e1' }}>{loading ? 'Laden...' : `${entries.length} Einträge`}</Typography>
          <Stack spacing={1} sx={{ maxHeight: 520, overflowY: 'auto' }}>
            {entries.map((entry) => {
              const key = entry.id || entry.slug
              const image = imageField ? entry[imageField] : undefined
              return <Button key={key} variant={selected === key ? 'contained' : 'outlined'} disabled={saving || loading}
                onClick={() => choose(entry)} sx={{ justifyContent: 'flex-start', textAlign: 'left', color: selected === key ? undefined : '#e2e8f0', gap: 1.5 }}>
                {image && <Box component="img" src={assetUrl(image)} alt="" loading="lazy"
                  sx={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />}
                {entry.title || entry.name || entry.text || key}
              </Button>
            })}
          </Stack>
        </Box>
        <Box component="form" onSubmit={save}>
          <Typography variant="h6" sx={{ mb: 2 }}>{selected ? 'Eintrag bearbeiten' : 'Eintrag erstellen'}</Typography>
          {imageField && form[imageField] && <Box component="img" key={form[imageField]}
            src={assetUrl(form[imageField])} alt={form.title || form.name || 'Bildvorschau'}
            sx={{ display: 'block', width: 240, maxWidth: '100%', height: 150, objectFit: 'contain', mb: 2,
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: 1 }} />}
          <Stack spacing={2} sx={{ '& .MuiInputBase-root, & .MuiInputLabel-root': { color: '#fff' },
            '& .MuiFormHelperText-root': { color: '#cbd5e1' } }}>
            {definition.fields.map((field) => <TextField key={`${resource}-${field.key}`} label={field.label}
              value={form[field.key] || ''} required={field.required} multiline={field.multiline}
              minRows={field.key === 'body' ? 10 : field.multiline ? 2 : undefined}
              slotProps={{ htmlInput: { maxLength: field.max } }} fullWidth
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />)}
            {imageField && <Button variant="outlined" component="label" sx={{ color: '#e2e8f0' }} disabled={saving}>
              Bild hochladen oder ersetzen
              <input hidden type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} />
            </Button>}
            {selected && <Typography variant="body2" sx={{ color: '#cbd5e1' }}>ID: {selected}</Typography>}
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={saving || !apiBaseUrl}>Speichern</Button>
              {selected && <Button type="button" color="error" variant="outlined" disabled={saving} onClick={remove}>Löschen</Button>}
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
