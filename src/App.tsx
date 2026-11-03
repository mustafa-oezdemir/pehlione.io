
import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import CV from './components/Sections/CV'
import Hobbies from './components/Sections/Hobbies'
import Foto from './page/Foto'
import BlogPostForm from './components/BlogPostForm'
import { findBlogPost } from './lib/blogPosts'
import Certificates from './components/Sections/Certificates'
import Projects from './components/Sections/Projects'
import Repos from './components/Sections/Repos'
import DeveloperInfo from './components/Sections/DeveloperInfo'
import Box from '@mui/material/Box'
import AgentDoc from './components/Lebenslauf'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { UploadForm } from '@/components/UploadForm'
import AdminLoginForm from '@/components/AdminLoginForm'
import { githubUsername } from '@/constants/github'


type MainView = 'default' | 'agentDoc' | 'hobbies' | 'certificates' | 'projects' | 'repos' | 'developer' | 'foto' | 'blog' | 'login' | 'upload'
type FotoCategory = 'gartenarbeit' | 'fotografie' | null
type AdminSession = { accessToken: string; tokenExpiresAt: number | null }

const Blog = lazy(() => import('./page/Blog'))

const seoDefaults = {
  title: 'Mustafa Ozdemir | Junior Anwendungsentwickler, Software Developer & Software Entwickler',
  description:
    'Mustafa Ozdemir ist Junior Anwendungsentwickler und Software Developer in Deutschland mit Fokus auf Java, Golang, Java Spring, C# .NET, TypeScript, React, PHP Laravel, Symfony, Grafana und PRTG.',
  keywords:
    'Junior Anwendungsentwickler, Software Developer, Software Entwickler, Java, Golang, Java Spring, C# .NET, TypeScript, React, PHP, Laravel, Symfony, Grafana, PRTG, Webentwickler, Backend Developer, Frontend Developer, Deutschland',
}

const setMetaContent = (selector: string, content: string) => {
  if (typeof document === 'undefined') return
  const node = document.querySelector<HTMLMetaElement>(selector)
  if (node) node.setAttribute('content', content)
}

function App() {
  const [ drawerOpen, setDrawerOpen ] = useState( false )
  const [ mainView, setMainView ] = useState<MainView>( 'default' )
  const [ fotoCategory, setFotoCategory ] = useState<FotoCategory>( null )
  const [ blogSlug, setBlogSlug ] = useState<string | null>( null )
  const [ adminEditor, setAdminEditor ] = useState<'media' | 'blog'>( 'media' )
  const [ pendingHash, setPendingHash ] = useState<string | null>( null )
  const [ adminSession, setAdminSession ] = useState<AdminSession>( {
    accessToken: '',
    tokenExpiresAt: null,
  } )
  const hasValidAdminSession =
    Boolean( adminSession.accessToken ) &&
    Boolean( adminSession.tokenExpiresAt ) &&
    ( adminSession.tokenExpiresAt ?? 0 ) > Date.now() + 10_000
  const isAdminView = mainView === 'login' || mainView === 'upload'

  const basePath = useMemo( () => {
    const base = ( import.meta.env.BASE_URL as string | undefined ) || '/'
    return base.endsWith( '/' ) ? base.slice( 0, -1 ) : base
  }, [] )

  const resolveRoute = useCallback( (
    pathname: string,
    search = ''
  ): { view: MainView; category: FotoCategory; blogSlug?: string | null } => {
    const withoutBase = basePath && pathname.startsWith( basePath )
      ? pathname.slice( basePath.length ) || '/'
      : pathname
    const clean = withoutBase.split( '?' )[ 0 ].split( '#' )[ 0 ]
    const [ segment, sub, third ] = clean.replace( /^\/+/, '' ).split( '/' )
    const legacyUploadQuery = new URLSearchParams( search ).has( 'upload' )

    if ( legacyUploadQuery ) return { view: 'login' as const, category: null }
    if ( !segment ) return { view: 'default' as const, category: null }
    if ( segment === 'cv' ) return { view: 'agentDoc' as const, category: null }
    if ( segment === 'hobby' || segment === 'hobbies' ) return { view: 'hobbies' as const, category: null }
    if ( segment === 'certificates' || segment === 'certificate' ) return { view: 'certificates' as const, category: null }
    if ( segment === 'projects' ) return { view: 'projects' as const, category: null }
    if ( segment === 'repos' || segment === 'repositories' ) return { view: 'repos' as const, category: null }
    if ( segment === 'developer' ) return { view: 'developer' as const, category: null }
    if ( segment === 'blog' && !third && (!sub || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub)) ) {
      return { view: 'blog' as const, category: null, blogSlug: sub || null }
    }
    if ( segment === 'login' ) return { view: 'login' as const, category: null }
    if ( segment === 'upload' ) return { view: 'upload' as const, category: null }
    if ( segment === 'foto' ) {
      const cat: FotoCategory = sub === 'fotografie'
        ? 'fotografie'
        : sub === 'gartenarbeit'
          ? 'gartenarbeit'
          : null
      return { view: 'foto' as const, category: cat }
    }

    return { view: 'default' as const, category: null }
  }, [ basePath ] )

  const toPath = useCallback( ( view: MainView, category?: FotoCategory, slug?: string | null ) => {
    if ( view === 'default' ) return '/'
    if ( view === 'agentDoc' ) return '/cv'
    if ( view === 'hobbies' ) return '/hobby'
    if ( view === 'certificates' ) return '/certificates'
    if ( view === 'projects' ) return '/projects'
    if ( view === 'repos' ) return '/repos'
    if ( view === 'developer' ) return '/developer'
    if ( view === 'blog' ) return slug ? `/blog/${ slug }` : '/blog'
    if ( view === 'login' ) return '/login'
    if ( view === 'upload' ) return '/upload'
    if ( view === 'foto' ) return `/foto/${ category ?? 'gartenarbeit' }`
    return '/'
  }, [] )

  const pushRoute = useCallback( ( view: MainView, category?: FotoCategory, hash?: string, slug?: string | null ) => {
    if ( typeof window === 'undefined' ) return
    const target = toPath( view, category, slug )
    const fullPath = basePath ? `${ basePath }${ target }` : target
    const searchParams = new URLSearchParams( window.location.search )
    searchParams.delete( 'upload' )
    const search = searchParams.toString()
    const nextHash = view === 'default' && hash !== undefined ? hash : ''
    const nextUrl = `${ fullPath }${ search ? `?${ search }` : '' }${ nextHash }`
    if ( window.location.pathname + window.location.search + window.location.hash !== nextUrl ) {
      window.history.pushState( {}, '', nextUrl )
    }
  }, [ basePath, toPath ] )

  const navigate = useCallback( ( view: MainView, category?: FotoCategory, hash?: string, slug?: string | null ) => {
    if ( category !== undefined ) setFotoCategory( category )
    setBlogSlug( view === 'blog' ? slug ?? null : null )
    setMainView( view )
    pushRoute( view, category, hash, slug )
    if ( hash !== undefined ) setPendingHash( hash )
  }, [ pushRoute ] )

  useEffect( () => {
    if ( typeof window === 'undefined' ) return
    const pending = sessionStorage.getItem( 'spa-redirect' )
    if ( pending ) {
      sessionStorage.removeItem( 'spa-redirect' )
      window.history.replaceState( {}, '', pending )
    }
    const { view, category, blogSlug: routeBlogSlug } = resolveRoute(
      window.location.pathname,
      window.location.search
    )
    setMainView( view )
    setBlogSlug( routeBlogSlug ?? null )
    if ( category ) setFotoCategory( category )
    const onPop = () => {
      const next = resolveRoute( window.location.pathname, window.location.search )
      setMainView( next.view )
      setBlogSlug( next.blogSlug ?? null )
      setFotoCategory( next.category )
    }
    window.addEventListener( 'popstate', onPop )
    return () => window.removeEventListener( 'popstate', onPop )
  }, [ resolveRoute ] )

  useEffect( () => {
    if ( typeof window === 'undefined' ) return
    if ( pendingHash === null ) return
    if ( mainView !== 'default' ) return
    const id = pendingHash.replace( /^#/, '' )
    const rootPath = basePath ? `${ basePath }/` : '/'
    const hashValue = id ? `#${ id }` : ''
    const nextUrl = rootPath + window.location.search + hashValue
    const currentUrl = window.location.pathname + window.location.search + window.location.hash
    if ( currentUrl !== nextUrl ) {
      window.history.replaceState( {}, '', nextUrl )
    }
    const el = id ? document.getElementById( id ) : null
    if ( el ) {
      el.scrollIntoView( { behavior: 'smooth', block: 'start' } )
    } else {
      window.scrollTo( { top: 0, behavior: 'smooth' } )
    }
    setPendingHash( null )
  }, [ pendingHash, mainView, basePath ] )

  useEffect( () => {
    if ( !adminSession.accessToken || !adminSession.tokenExpiresAt ) return

    const msUntilExpiry = adminSession.tokenExpiresAt - Date.now()
    if ( msUntilExpiry <= 0 ) {
      setAdminSession( { accessToken: '', tokenExpiresAt: null } )
      return
    }

    const timeoutId = window.setTimeout( () => {
      setAdminSession( { accessToken: '', tokenExpiresAt: null } )
    }, msUntilExpiry )

    return () => window.clearTimeout( timeoutId )
  }, [ adminSession ] )

  useEffect( () => {
    if ( mainView === 'upload' && !hasValidAdminSession ) {
      navigate( 'login' )
      return
    }

    if ( mainView === 'login' && hasValidAdminSession ) {
      navigate( 'upload' )
    }
  }, [ mainView, hasValidAdminSession, navigate ] )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const path = toPath(mainView, fotoCategory, blogSlug)
    const absoluteUrl = new URL(path, 'https://pehlione.com').toString()
    const routeSeo: Record<Exclude<MainView, 'foto'>, typeof seoDefaults> = {
      default: seoDefaults,
      agentDoc: {
        title: 'Lebenslauf | Mustafa Ozdemir - Junior Anwendungsentwickler',
        description:
          'Lebenslauf von Mustafa Ozdemir, Junior Anwendungsentwickler und Software Entwickler mit Projekten in Java, Golang, React, PHP Laravel, Symfony und C# .NET.',
        keywords:
          'Lebenslauf Junior Anwendungsentwickler, CV Software Developer, Java, Golang, React, Laravel, Symfony, C# .NET',
      },
      hobbies: {
        title: 'Hobbys und Interessen | Mustafa Ozdemir',
        description:
          'Persoenliche Interessen von Mustafa Ozdemir mit Einblicken in Fotografie, Gartenarbeit und die kreative Arbeitsweise hinter dem Portfolio.',
        keywords:
          'Mustafa Ozdemir Hobbys, Fotografie, Gartenarbeit, Portfolio Deutschland',
      },
      certificates: {
        title: 'Zertifikate | Mustafa Ozdemir - Software Developer',
        description:
          'Zertifikate und Weiterbildungen von Mustafa Ozdemir in Java, React, Golang, PHP, Kubernetes, DevOps und Full-Stack-Entwicklung.',
        keywords:
          'Zertifikate Java React Golang PHP Kubernetes DevOps Full Stack Software Developer',
      },
      projects: {
        title: 'Projekte | Mustafa Ozdemir - Java, Golang, React, Laravel, Symfony, .NET',
        description:
          'Softwareprojekte von Mustafa Ozdemir mit Java, Golang, TypeScript, React, PHP Laravel, Symfony, C# .NET, Grafana und PRTG.',
        keywords:
          'Java Projekte, Golang Projekte, React Portfolio, Laravel, Symfony, C# .NET, Grafana, PRTG',
      },
      repos: {
        title: 'Repositories | Mustafa Ozdemir',
        description:
          'GitHub Repositories und Codebeispiele von Mustafa Ozdemir als Junior Anwendungsentwickler und Software Developer.',
        keywords:
          'GitHub Repositories Software Developer Junior Anwendungsentwickler',
      },
      developer: {
        title: 'Entwicklerprofil | Mustafa Ozdemir - Junior Anwendungsentwickler',
        description:
          'Entwicklerprofil von Mustafa Ozdemir mit Schwerpunkten in Java, Java Spring, Golang, C# .NET, TypeScript, React, PHP Laravel, Symfony, Grafana und PRTG.',
        keywords:
          'Entwicklerprofil, Junior Anwendungsentwickler, Software Entwickler, Java Spring, Golang, .NET, React, Laravel, Symfony, Grafana, PRTG',
      },
      blog: {
        title: 'Blog | Mustafa Ozdemir - Softwareentwicklung',
        description:
          'Technische Blogbeiträge, Tutorials und persönliche Lernnotizen zu Softwareentwicklung, React, Java und mehr.',
        keywords:
          'Softwareentwicklung Blog, React, Java, TypeScript, Tutorials, Programmierung, Lernnotizen',
      },
      login: {
        title: 'Admin Login | Mustafa Ozdemir',
        description:
          'Geschuetzter Login fuer den Admin-Bereich und das Hinzufuegen neuer Inhalte.',
        keywords:
          'Admin Login, JWT Login, Upload Bereich',
      },
      upload: {
        title: 'Content Upload | Mustafa Ozdemir',
        description:
          'Geschuetzter Bereich zum Hochladen neuer Inhalte und Bilder.',
        keywords:
          'Content Upload, Admin Upload, JWT geschuetzt',
      },
    }

    const fotoSeo =
      fotoCategory === 'fotografie'
        ? {
            title: 'Fotografie | Mustafa Ozdemir',
            description:
              'Fotografie-Seite von Mustafa Ozdemir mit Natur- und Landschaftsaufnahmen als Teil des persoenlichen Portfolios.',
            keywords: 'Fotografie Portfolio Mustafa Ozdemir Naturfotografie',
          }
        : {
            title: 'Gartenarbeit | Mustafa Ozdemir',
            description:
              'Gartenarbeit und Pflanzenfotos von Mustafa Ozdemir als Teil des persoenlichen Portfolios und seiner praktischen Interessen.',
            keywords: 'Gartenarbeit Portfolio Mustafa Ozdemir Pflanzen',
          }

    const post = mainView === 'blog' && blogSlug ? findBlogPost(blogSlug) : null
    const currentSeo = mainView === 'foto' ? fotoSeo : post ? {
      title: `${post.title} | Blog | Mustafa Ozdemir`,
      description: post.summary,
      keywords: routeSeo.blog.keywords,
    } : routeSeo[mainView]

    document.title = currentSeo.title
    document.documentElement.lang = 'de'
    setMetaContent('meta[name="title"]', currentSeo.title)
    setMetaContent('meta[name="description"]', currentSeo.description)
    setMetaContent('meta[name="keywords"]', currentSeo.keywords)
    setMetaContent('meta[property="og:title"]', currentSeo.title)
    setMetaContent('meta[property="og:description"]', currentSeo.description)
    setMetaContent('meta[property="og:url"]', absoluteUrl)
    setMetaContent('meta[property="twitter:title"]', currentSeo.title)
    setMetaContent('meta[property="twitter:description"]', currentSeo.description)
    setMetaContent('meta[property="twitter:url"]', absoluteUrl)

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) canonical.href = absoluteUrl
  }, [mainView, fotoCategory, blogSlug, toPath])
  return (
    <div className="app-shell min-h-dvh w-full">
      <a id="home" />
      <Header
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        homeHref={basePath ? `${ basePath }/` : '/'}
        onSelectMain={(v, hash) => {
          const nextHash = v === 'default' && hash === undefined ? '' : hash
          navigate(v, undefined, nextHash);
          setDrawerOpen(false);
        }}
      />
      <Box
        component="main"
        sx={{
          pt: { xs: "65px", sm: "64px" },
          ml: {
            xs: drawerOpen ? "240px" : "65px",
            sm: drawerOpen ? "240px" : "65px",
          },
          width: {
            xs: drawerOpen ? "calc(100% - 240px)" : "calc(100% - 65px)",
            sm: drawerOpen ? "calc(100% - 240px)" : "calc(100% - 65px)",
          },
          minHeight: "100vh",
        }}>
        {mainView === "login" ? (
          <section className="admin-shell d-flex align-items-center min-vh-100 w-100 py-5">
            <div className="container-xl admin-shell__content">
              <div className="row g-5 align-items-center">
                <div className="col-12 col-xl-7">
                  <div className="pe-xl-4">
                    <span className="admin-shell__eyebrow">
                  Admin Bereich
                    </span>
                    <h1 className="admin-shell__title display-4 mt-4 mb-0">
                  Geschützter Zugang für neue Inhalte
                    </h1>
                    <p className="admin-shell__copy fs-5 mt-4 mb-0">
                  Melde dich mit den Server-Zugangsdaten an, um Bilder,
                  Zertifikate und Blogbeiträge sicher über JWT-geschützte
                  Endpunkte zu verwalten.
                    </p>
                    <div className="admin-shell__chips mt-4">
                      <span className="admin-shell__chip">
                    Short-lived JWT
                      </span>
                      <span className="admin-shell__chip">
                    Serverseitige .env-Prüfung
                      </span>
                      <span className="admin-shell__chip">
                    Keine Secrets im Browser-Build
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-xl-5">
                  <AdminLoginForm
                    onLoginSuccess={( session ) =>
                      setAdminSession( {
                        accessToken: session.accessToken,
                        tokenExpiresAt: session.expiresAt,
                      } )
                    }
                  />
                  <div className="d-flex justify-content-center mt-4">
                    <Button variant="outlined" onClick={() => navigate('default')}>
                    App anzeigen
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : mainView === "upload" ? (
          <section className="admin-shell d-flex align-items-center min-vh-100 w-100 py-5">
            <div className="container-xl admin-shell__content">
              <div className="row g-5 align-items-center">
                <div className="col-12 col-xl-7">
                  <div className="pe-xl-4">
                    <span className="admin-shell__eyebrow">
                  Upload Console
                    </span>
                    <h1 className="admin-shell__title display-4 mt-4 mb-0">
                  Neue Inhalte direkt im Admin-Bereich erfassen
                    </h1>
                    <p className="admin-shell__copy fs-5 mt-4 mb-0">
                  Die aktuelle Sitzung ist aktiv. Du kannst jetzt Bilder hochladen
                  sowie neue Zertifikate, Blogbeiträge oder Galerie-Einträge anlegen.
                    </p>
                    <div className="row g-3 mt-2">
                      <div className="col-12 col-md-4">
                        <div className="admin-shell__stat">
                          <p className="admin-shell__stat-label mb-0">Status</p>
                          <p className="admin-shell__stat-value mb-0">JWT aktiv</p>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="admin-shell__stat">
                          <p className="admin-shell__stat-label mb-0">Ziel</p>
                          <p className="admin-shell__stat-value mb-0">Fotos, Zertifikate & Blog</p>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="admin-shell__stat">
                          <p className="admin-shell__stat-label mb-0">Sicherheit</p>
                          <p className="admin-shell__stat-value mb-0">Bearer Token</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-xl-5">
                  <Tabs
                    value={adminEditor}
                    onChange={(_, value: 'media' | 'blog') => setAdminEditor(value)}
                    variant="fullWidth"
                    aria-label="Inhaltstyp wählen"
                    sx={{ mb: 2, '& .MuiTab-root': { color: 'rgba(226, 232, 240, 0.8)' },
                      '& .MuiTab-root.Mui-selected': { color: '#fff' }, '& .MuiTabs-indicator': { bgcolor: '#38bdf8' } }}
                  >
                    <Tab value="media" label="Bilder & Zertifikate" />
                    <Tab value="blog" label="Blog" />
                  </Tabs>
                  {adminEditor === 'blog' ? (
                    <BlogPostForm
                      accessToken={adminSession.accessToken}
                      tokenExpiresAt={adminSession.tokenExpiresAt}
                      onSessionExpired={() => {
                        setAdminSession( { accessToken: '', tokenExpiresAt: null } )
                        navigate( 'login' )
                      }}
                    />
                  ) : (
                    <UploadForm
                      accessToken={adminSession.accessToken}
                      tokenExpiresAt={adminSession.tokenExpiresAt}
                      onSessionExpired={() => {
                        setAdminSession( { accessToken: '', tokenExpiresAt: null } )
                        navigate( 'login' )
                      }}
                    />
                  )}
                  <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
                    <Button
                      variant="outlined"
                      sx={{ color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.6)' }}
                      onClick={() => {
                        setAdminSession( { accessToken: '', tokenExpiresAt: null } )
                        navigate( 'login' )
                      }}
                    >
                      Abmelden
                    </Button>
                    <Button variant="outlined" sx={{ color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.6)' }} onClick={() => navigate('default')}>
                    App anzeigen
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : mainView === "blog" ? (
          <Suspense fallback={null}>
            <Blog
              slug={blogSlug}
              onOpenPost={(slug) => {
                navigate('blog', undefined, undefined, slug)
                window.scrollTo(0, 0)
              }}
              onBack={() => navigate('blog')}
            />
          </Suspense>
        ) : mainView === "agentDoc" ? (
          <section className="w-screen -ml-[65px] -mr-[65px] px-[calc(65px+1rem)] sm:px-[calc(65px+1.5rem)] lg:px-[calc(65px+2.5rem)] py-12">
            <AgentDoc />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : mainView === "hobbies" ? (
          <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
            <h1 className="text-3xl font-bold mb-4">Hobbys • Details</h1>
            <Hobbies
              variant="detail"
              onOpenPage={(page) => {
                navigate("foto", page);
              }}
              onOpenDeveloper={() => navigate("developer")}
            />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : mainView === "foto" ? (
          <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
            <Foto category={fotoCategory ?? "gartenarbeit"} />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : mainView === "certificates" ? (
          <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
            <h1 className="text-3xl font-bold mb-4">Zertifikate • Details</h1>
            <Certificates variant="detail" />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : mainView === "projects" ? (
          <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
            <h1 className="text-3xl font-bold mb-4">Projekte • Details</h1>
            <Projects variant="detail" />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : mainView === "repos" ? (
          <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
            <h1 className="text-3xl font-bold mb-4">Repositories • Details</h1>
            <Repos
              username={githubUsername}
              perPage={12}
              onOpenDrawer={() => setDrawerOpen(true)}
              variant="detail"
            />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : mainView === "developer" ? (
          <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
            <h1 className="text-3xl font-bold mb-4">
              Anwendungsentwickler • Details
            </h1>
            <DeveloperInfo variant="detail" />
            <div className="mt-6">
              <Button variant="outlined" onClick={() => navigate("default")}>
                Zur Übersicht
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="w-full px-4 sm:px-6 lg:px-10 py-12">
              <h1 className="text-3xl font-bold mb-2">Mustafa's Portfolio</h1>

              <p className="text-neutral-700 dark:text-neutral-300">
                Diese Website dient als Portfolio und persönliche Seite von
                Mustafa. Die Grundversion ist fertiggestellt, weitere Funktionen
                und Inhalte werden nach und nach ergänzt. Hier finden Sie
                Informationen über meine Fähigkeiten, Projekte und Hobbys.
              </p>
            </section>
            <CV
              onOpenDrawer={() => setDrawerOpen(true)}
              onNavigateToCv={() => navigate("agentDoc")}
            />
            <Hobbies
              onOpenDrawer={() => setDrawerOpen(true)}
              onOpenPage={(page) => {
                navigate("foto", page);
              }}
              onOpenDeveloper={() => navigate("developer")}
            />
            <Certificates onOpenDrawer={() => setDrawerOpen(true)} />
            <Projects onOpenDrawer={() => setDrawerOpen(true)} />
            <Repos
              username={githubUsername}
              perPage={6}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
            <DeveloperInfo onOpenDrawer={() => setDrawerOpen(true)} />
          </>
        )}
      </Box>
      {!isAdminView && (
        <Box
          sx={{
            ml: {
              xs: drawerOpen ? "240px" : "57px",
              sm: drawerOpen ? "240px" : "65px",
            },
            mr: {
              xs: drawerOpen ? "240px" : "57px",
              sm: drawerOpen ? "240px" : "65px",
            },
          }}>
          <Footer />
        </Box>
      )}
    </div>
  );
}

export default App
