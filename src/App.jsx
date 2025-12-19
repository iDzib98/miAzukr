import React, { useEffect, useState, createContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginView from './components/LoginView'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Registros from './pages/Registros'
import Informes from './pages/Informes'
import Configuracion from './pages/Configuracion'
import { onAuthChanged } from './firebaseClient'

export const AuthContext = createContext({ user: null })

export default function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    let unsubscribe = () => {}
    ;(async () => {
      try {
        unsubscribe = await onAuthChanged(u => {
          setUser(u)
        })
      } catch (e) {
        console.warn('Auth listener error', e)
        setUser(null)
      }
    })()
    return () => unsubscribe()
  }, [])

  if (user === undefined) return <div>Loading...</div>

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginView />} />

          <Route path="/" element={user ? <MainLayout /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="registros" element={<Registros />} />
            <Route path="informes" element={<Informes />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
