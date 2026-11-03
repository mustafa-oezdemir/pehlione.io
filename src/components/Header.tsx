import { styled, useTheme, type Theme, type CSSObject } from '@mui/material/styles'
import Box from '@mui/material/Box'
import MuiDrawer from '@mui/material/Drawer'
import MuiAppBar, { type AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import Button from '@mui/material/Button'
import { navItems } from '@/constants/nav'

const drawerWidth = 240

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
})

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
})

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}))

interface AppBarStyledProps extends MuiAppBarProps {
  open?: boolean
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarStyledProps>(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}))

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': openedMixin(theme),
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': closedMixin(theme),
        },
      },
    ],
  }),
)

export type Props = {
  open: boolean
  onOpen: () => void
  onClose: () => void
  homeHref: string
  onSelectMain: (view: 'default' | 'agentDoc' | 'hobbies' | 'certificates' | 'projects' | 'repos' | 'developer' | 'blog' | 'login', hash?: string) => void
}

function Header({ open, onOpen, onClose, homeHref, onSelectMain }: Props) {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={open} color="default" enableColorOnDark>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={onOpen}
            edge="start"
            sx={[
              {
                marginRight: 5,
              },
              open && { display: 'none' },
            ]}
          >
            <MenuIcon />
          </IconButton>
            <Typography
            variant="h6"
            noWrap
            component="a"
            href={homeHref}
            onClick={(event) => {
              event.preventDefault()
              onSelectMain('default', '')
            }}
            sx={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', background: 'none', border: 0, padding: 0 }}
            >
            pehlione
            </Typography>
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, ml: 'auto' }}>
            {navItems.map((item) => (
              <Button
                key={item.key}
                onClick={() => item.key === 'blog'
                  ? onSelectMain('blog')
                  : onSelectMain('default', item.href)}
                size="small"
                sx={{ color: 'text.primary' }}
              >
                {item.label}
              </Button>
            ))}
            <Button
              onClick={() => onSelectMain('login')}
              size="small"
              sx={{ color: 'text.primary' }}
              startIcon={<AdminPanelSettingsIcon />}
            >
              Admin
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={onClose} aria-label="close drawer">
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.key} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component="button"
                onClick={() => {
                  if (item.key === 'cv') {
                    onSelectMain('agentDoc')
                  } else if (item.key === 'hobbies') {
                    onSelectMain('hobbies')
                  } else if (item.key === 'certificates') {
                    onSelectMain('certificates')
                  } else if (item.key === 'projects') {
                    onSelectMain('projects')
                  } else if (item.key === 'repos') {
                    onSelectMain('repos')
                  } else if (item.key === 'blog') {
                    onSelectMain('blog')
                  } else if (item.key === 'developer') {
                    onSelectMain('developer')
                  }
                  onClose()
                }}
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                  },
                  open
                    ? {
                        justifyContent: 'initial',
                      }
                    : {
                        justifyContent: 'center',
                      },
                ]}
              >
                <ListItemIcon
                  sx={[
                    {
                      minWidth: 0,
                      justifyContent: 'center',
                    },
                    open
                      ? {
                          mr: 3,
                        }
                      : {
                          mr: 'auto',
                        },
                  ]}
                >
                  {item.icon && <item.icon />}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.detail}
                  secondaryTypographyProps={{ sx: { fontSize: 12, color: 'text.secondary' } }}
                  sx={[
                    open
                      ? {
                          opacity: 1,
                        }
                      : {
                          opacity: 0,
                        },
                  ]}
                />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component="button"
              onClick={() => {
                onSelectMain('login')
                onClose()
              }}
              sx={[
                {
                  minHeight: 48,
                  px: 2.5,
                },
                open
                  ? {
                      justifyContent: 'initial',
                    }
                  : {
                      justifyContent: 'center',
                    },
              ]}
            >
              <ListItemIcon
                sx={[
                  {
                    minWidth: 0,
                    justifyContent: 'center',
                  },
                  open
                    ? {
                        mr: 3,
                      }
                    : {
                        mr: 'auto',
                      },
                ]}
              >
                <AdminPanelSettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Admin"
                secondary="Login ve Upload"
                secondaryTypographyProps={{ sx: { fontSize: 12, color: 'text.secondary' } }}
                sx={[
                  open
                    ? {
                        opacity: 1,
                      }
                    : {
                        opacity: 0,
                      },
                ]}
              />
            </ListItemButton>
          </ListItem>
        </List>
        {/* Details nicht im Drawer, sondern im Main angezeigt */}
      </Drawer>
    </Box>
  )
}
export default Header
