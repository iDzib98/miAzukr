import React, { useState, useContext } from 'react'
import { Box, TextField, Button, Typography, Paper } from '@mui/material'
import { signInWithEmail, signInWithGoogle } from '../firebaseClient'
import { AuthContext } from '../App'
import LoadingLogo from './LoadingLogo'

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
    <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: { xs: '100%', sm: 560, md: 800 },
          maxWidth: '1000px',
          display: { xs: 'block', md: 'flex' },
          alignItems: 'center',
        }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: { md: '0 0 40%' },
          pr: { md: 4 },
          pb: { xs: 2, md: 0 },
        }}>
          <LoadingLogo size={160} style={{ marginBottom: 8 }} />
          <Typography variant="h6" component="h1">
            Iniciar sesión
          </Typography>
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            miAzukr
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
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
        </Box>
      </Paper>
    </Box>
  )
}
