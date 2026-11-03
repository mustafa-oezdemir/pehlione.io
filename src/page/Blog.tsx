import { Box, Button, Container, Pagination, Paper, Typography } from '@mui/material'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { blogPosts, findBlogPost } from '@/lib/blogPosts'

type Props = {
  slug: string | null
  onOpenPost: (slug: string) => void
  onBack: () => void
}

export default function Blog({ slug, onOpenPost, onBack }: Props) {
  const post = slug ? findBlogPost(slug) : null
  const requestedPage = Number(new URLSearchParams(window.location.search).get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, Math.max(blogPosts.length, 1))
    : 1
  const listedPost = blogPosts[page - 1]

  const changePage = (_event: unknown, nextPage: number) => {
    const url = new URL(window.location.href)
    if (nextPage === 1) url.searchParams.delete('page')
    else url.searchParams.set('page', String(nextPage))
    window.location.assign(url.toString())
  }

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="lg">
        <Typography
          component="p"
          variant="overline"
          color="primary"
          sx={{ letterSpacing: 2 }}
        >
          SOFTWARE DEVELOPMENT
        </Typography>

        <Typography component="h1" variant="h3" sx={{ fontWeight: 700, mt: 1, mb: 2 }}>
          {slug ? post?.title ?? 'Beitrag nicht gefunden' : 'Blog'}
        </Typography>

        {slug ? (
          <>
            {post && (
              <>
                <Typography color="text.secondary" sx={{ maxWidth: 720, mb: 2 }}>
                  {post.summary}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mb: 5 }}>
                  {new Date(post.date).toLocaleDateString('de-DE')}
                </Typography>
                <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
                  <Box sx={{
                    '& h2': { fontSize: '1.6rem', fontWeight: 700, mt: 4, mb: 2 },
                    '& h3': { fontSize: '1.3rem', fontWeight: 600, mt: 3, mb: 1.5 },
                    '& p, & ul, & ol': { lineHeight: 1.8, mb: 2 },
                    '& pre': { overflowX: 'auto', p: 2, borderRadius: 2, bgcolor: 'action.hover' },
                    '& code': { fontFamily: 'monospace' },
                    '& a': { color: 'primary.main' },
                  }}>
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      skipHtml
                      components={{ h1: ({ children }) => <h2>{children}</h2> }}
                    >
                      {post.body}
                    </Markdown>
                  </Box>
                </Paper>
              </>
            )}
            <Button onClick={onBack} sx={{ mt: 3 }}>Alle Beiträge anzeigen</Button>
          </>
        ) : (
          <>
            <Typography color="text.secondary" sx={{ maxWidth: 720, mb: 5 }}>
              Meine Notizen, Erfahrungen und Erkenntnisse aus der Softwareentwicklung.
              Hier dokumentiere ich, was ich lerne – Schritt für Schritt.
            </Typography>

            <Box component="section" aria-labelledby="blog-posts">
              <Typography id="blog-posts" component="h2" variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Alle Beiträge
              </Typography>

              {blogPosts.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
                  <Typography color="text.secondary">
                    Noch keine Blogbeiträge veröffentlicht. Die ersten Artikel folgen bald.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <Paper component="article" variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                    <Typography component="p" variant="overline" color="primary.main">
                      {page === 1 ? 'Neuester Beitrag' : 'Älterer Beitrag'}
                    </Typography>
                    <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
                      {listedPost.title}
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                      {new Date(listedPost.date).toLocaleDateString('de-DE')}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 2, mb: 2 }}>{listedPost.summary}</Typography>
                    <Button onClick={() => onOpenPost(listedPost.slug)}>Beitrag lesen</Button>
                  </Paper>
                  {blogPosts.length > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Pagination
                        aria-label="Blog-Seiten"
                        count={blogPosts.length}
                        page={page}
                        onChange={changePage}
                        color="primary"
                        shape="rounded"
                        showFirstButton
                        showLastButton
                        getItemAriaLabel={(type, number) => {
                          if (type === 'page') return `Seite ${number}`
                          if (type === 'first') return 'Erste Seite'
                          if (type === 'last') return 'Letzte Seite'
                          if (type === 'next') return 'Nächste Seite'
                          return 'Vorherige Seite'
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          </>
        )}
      </Container>
    </Box>
  )
}
