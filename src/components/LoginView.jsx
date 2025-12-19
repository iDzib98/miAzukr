import React, { useState, useContext } from 'react'
import { Box, TextField, Button, Typography, Paper } from '@mui/material'
import { signInWithEmail, signInWithGoogle } from '../firebaseClient'
import { AuthContext } from '../App'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { setUser } = useContext(AuthContext)

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await signInWithEmail(email, password)
      setUser(res.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      const res = await signInWithGoogle()
      setUser(res.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, width: 360 }} elevation={3}>
        <Typography variant="h6" component="h1" gutterBottom>
          Iniciar sesión
        </Typography>
        <form onSubmit={handleEmailSignIn}>
          <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth margin="normal" />
          <TextField label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={loading}>
            Iniciar con email
          </Button>
        </form>

        <Typography align="center" sx={{ my: 2 }}>o</Typography>

        <Button variant="outlined" fullWidth onClick={handleGoogle} disabled={loading}>
          Iniciar con Google
        </Button>
      </Paper>
    </Box>
  )
}
