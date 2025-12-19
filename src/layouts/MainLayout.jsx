import React, { useContext } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Paper, BottomNavigation, BottomNavigationAction, AppBar, Toolbar, Typography, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ListAltIcon from '@mui/icons-material/ListAlt'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SettingsIcon from '@mui/icons-material/Settings'
import { AuthContext } from '../App'
import { signOut } from '../firebaseClient'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Registros', path: '/registros', icon: <ListAltIcon /> },
  { label: 'Informes', path: '/informes', icon: <AssessmentIcon /> },
  { label: 'Configuración', path: '/configuracion', icon: <SettingsIcon /> }
]

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const theme = useTheme()
  const isLarge = useMediaQuery(theme.breakpoints.up('md'))

  const current = navItems.findIndex(i => location.pathname.startsWith(i.path))

  return (
    <Box sx={{ pb: 7, pt: isLarge ? '64px' : 0, '--top-offset': isLarge ? '64px' : '0px', '--bottom-offset': isLarge ? '0px' : '56px' }}>
      {/* AppBar para pantallas grandes */}
      {isLarge && (
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              miAzukr
            </Typography>

            {navItems.map((item, idx) => {
              const active = location.pathname.startsWith(item.path)
              return (
                <Button
                  key={item.path}
                  color="inherit"
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    textTransform: 'none',
                    fontWeight: active ? '700' : '400',
                    mx: 1,
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                  }}
                >
                  {item.label}
                </Button>
              )
            })}
          </Toolbar>
        </AppBar>
      )}

      <Outlet />

      {/* Bottom navigation para pantallas pequeñas */}
      {!isLarge && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (theme) => theme.zIndex.appBar + 1 }} elevation={6}>
          <BottomNavigation
            showLabels
            value={current === -1 ? 0 : current}
            onChange={(e, v) => navigate(navItems[v].path)}
          >
            {navItems.map(item => (
              <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
