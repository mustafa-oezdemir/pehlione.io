import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { apiBaseUrl } from '@/constants/api'

type Props = {
  accessToken: string
  tokenExpiresAt: number | null
  onSessionExpired: () => void
}

type CreateResponse = {
  post?: { slug: string }
}

export default function BlogPostForm({ accessToken, tokenExpiresAt, onSessionExpired }: Props) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedSlug, setSavedSlug] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !summary.trim() || !body.trim()) return
    if (!accessToken || !tokenExpiresAt || tokenExpiresAt - Date.now() <= 10_000) {
      onSessionExpired()
      return
    }
    if (!apiBaseUrl) {
      setError('Der Blog-Editor ist nur lokal mit npm run dev verfügbar.')
      return
    }

    setSaving(true)
    setError('')
    setSavedSlug('')
    try {
      const { data } = await axios.post<CreateResponse>(`${apiBaseUrl}/blog`, {
        title: title.trim(),
        summary: summary.replace(/\s+/g, ' ').trim(),
        body: body.trim(),
      }, {
        timeout: 10_000,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!data.post?.slug) throw new Error('Keine Antwort vom Server erhalten.')
      setSavedSlug(data.post.slug)
      setTitle('')
      setSummary('')
      setBody('')
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        onSessionExpired()
        return
      }
      setError(axios.isAxiosError(cause)
        ? cause.response?.data?.error || cause.message
        : 'Der Beitrag konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box className="admin-form-card" component="form" onSubmit={handleSubmit} sx={{ p: 3, color: '#fff', mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Neuen Blogbeitrag schreiben</Typography>
      <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.82)', mb: 2 }}>
        Der Beitrag wird lokal gespeichert. Nach Commit und Deployment erscheint er auf der Website.
      </Typography>
      <Stack spacing={2} sx={{
        '& .MuiInputBase-root': { color: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.75)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#e2e8f0' },
        '& .MuiFormHelperText-root': { color: 'rgba(226, 232, 240, 0.82)' },
        '& .MuiButton-root.Mui-disabled': { color: 'rgba(255, 255, 255, 0.7)', bgcolor: 'rgba(148, 163, 184, 0.25)' },
      }}>
        <TextField label="Blogtitel" value={title} onChange={(event) => setTitle(event.target.value)}
          inputProps={{ maxLength: 120 }} required fullWidth />
        <TextField label="Kurzbeschreibung" value={summary} onChange={(event) => setSummary(event.target.value)}
          inputProps={{ maxLength: 300 }} required multiline minRows={2} fullWidth />
        <TextField label="Markdown-Inhalt" value={body} onChange={(event) => setBody(event.target.value)}
          inputProps={{ maxLength: 50_000 }} required multiline minRows={10} fullWidth
          helperText="Überschriften mit ## und ###, Codeblöcke mit drei Backticks." />
        {error && <Alert severity="error">{error}</Alert>}
        {savedSlug && (
          <Alert severity="success">
            Beitrag lokal gespeichert. <a href={`/blog/${savedSlug}`}>Beitrag ansehen</a>
          </Alert>
        )}
        <Button type="submit" variant="contained" disabled={saving || !title.trim() || !summary.trim() || !body.trim()}>
          {saving ? 'Speichern...' : 'Blogbeitrag lokal speichern'}
        </Button>
      </Stack>
    </Box>
  )
}
