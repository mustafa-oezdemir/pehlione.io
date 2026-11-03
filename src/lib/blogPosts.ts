export type BlogPost = {
  slug: string
  title: string
  summary: string
  date: string
  body: string
}

const files = import.meta.glob('/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function parsePost(path: string, source: string): BlogPost | null {
  const slug = path.split('/').at(-1)?.replace(/\.md$/, '')
  const match = /^---\r?\ntitle: (".*")\r?\nsummary: (".*")\r?\ndate: (".*")\r?\n---\r?\n([\s\S]*)$/.exec(source)
  if (!slug || !match) return null

  try {
    const title: unknown = JSON.parse(match[1])
    const summary: unknown = JSON.parse(match[2])
    const date: unknown = JSON.parse(match[3])
    if (typeof title !== 'string' || typeof summary !== 'string' ||
        typeof date !== 'string' || Number.isNaN(Date.parse(date))) return null
    return { slug, title, summary, date, body: match[4].trim() }
  } catch {
    return null
  }
}

export const blogPosts = Object.entries(files)
  .map(([path, source]) => parsePost(path, source))
  .filter((post): post is BlogPost => post !== null)
  .sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug))

export function findBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug)
}
