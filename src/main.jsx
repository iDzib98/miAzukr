
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from './theme.jsx'
import CssBaseline from '@mui/material/CssBaseline'

// Lee preferencia de tema antes de inicializar la app (desde localStorage)
let initialPref = undefined
try {
  initialPref = localStorage.getItem('themePreference')
} catch (e) {
  initialPref = undefined
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider initialPreference={initialPref}>
    <CssBaseline />
    <App />
  </ThemeProvider>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registrado', reg))
      .catch(err => console.error('Error registrando Service Worker', err))
  })
}
