import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles'

// preference: 'system' | 'light' | 'dark'
const STORAGE_KEY = 'themePreference'

const ThemePrefContext = createContext({ preference: 'system', mode: 'light', setPreference: () => {} })

function detectSystemMode() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children, initialPreference }) {
  const stored = initialPreference || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)
  const [preference, setPreference] = useState(stored || 'system')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch (e) {
      // ignore
    }
  }, [preference])

  const systemMode = useMemo(() => detectSystemMode(), [])
  const mode = useMemo(() => {
    if (preference === 'system') return systemMode
    return preference === 'dark' ? 'dark' : 'light'
  }, [preference, systemMode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode
        },
        // Make BottomNavigation slightly lighter in dark mode
        components: {
          MuiBottomNavigation: {
            styleOverrides: {
              root: {
                backgroundImage: mode === 'dark' ? 'linear-gradient(rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.09));' : undefined
              }
            }
          }
        }
      }),
    [mode]
  )

  return (
    <ThemePrefContext.Provider value={{ preference, mode, setPreference }}>
      <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>
    </ThemePrefContext.Provider>
  )
}

export function useThemePreference() {
  return useContext(ThemePrefContext)
}

export { STORAGE_KEY }
