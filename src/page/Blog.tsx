import { Box, Container, Paper, Typography } from '@mui/material'

export default function Blog() {
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
          Blog
        </Typography>

        <Typography color="text.secondary" sx={{ maxWidth: 720, mb: 5 }}>
          Meine Notizen, Erfahrungen und Erkenntnisse aus der Softwareentwicklung.
          Hier dokumentiere ich, was ich lerne – Schritt für Schritt.
        </Typography>

        <Box component="section" aria-labelledby="blog-posts">
          <Typography
            id="blog-posts"
            component="h2"
            variant="h5"
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Alle Beiträge
          </Typography>

          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
            <Typography color="text.secondary">
              Noch keine Blogbeiträge veröffentlicht. Die ersten Artikel folgen bald.
            </Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}
