import React, { useContext, useState, useEffect } from 'react'
import { Box, Typography, Paper, TextField, Button, Fab, List, ListItem, ListItemText, Divider, Snackbar } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { AuthContext } from '../App'
import { getUserProfile, getUserRecords, saveUserRecord } from '../firebaseClient'
import RecordForm from '../components/RecordForm'

function formatDateInput(d) {
  const dt = new Date(d)
  return dt.toISOString().slice(0,10)
}

export default function Registros() {
  const { user } = useContext(AuthContext)
  const [profile, setProfile] = useState(null)
  const [records, setRecords] = useState([])
  const [start, setStart] = useState(formatDateInput(new Date(Date.now() - 30*24*60*60*1000)))
  const [end, setEnd] = useState(formatDateInput(new Date()))
  const [formOpen, setFormOpen] = useState(false)
  const [snack, setSnack] = useState({ open:false, message: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user?.email) return
      const p = await getUserProfile(user.email)
      if (mounted) setProfile(p)
    })()
    return () => mounted = false
  }, [user])

  async function fetchRecords() {
    if (!user?.email) return
    try {
      // ensure start includes start of local day and end includes end of local day
      const from = start ? (() => { const [y, m, d] = start.split('-').map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0) })() : null
      const to = end ? (() => { const [y, m, d] = end.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59, 999) })() : null
      const res = await getUserRecords(user.email, from, to)
      setRecords(res)
    } catch (e) {
      console.error('Error fetching records', e)
    }
  }

  useEffect(() => { fetchRecords() }, [user, start, end])

  async function handleSaveRecord(rec) {
    if (!user?.email) return
    try {
      const res = await saveUserRecord(user.email, rec)
      if (res && res.offline) setSnack({ open:true, message: 'Registro guardado localmente; se sincronizará más tarde' })
      else setSnack({ open:true, message: 'Registro guardado' })
      setFormOpen(false)
      fetchRecords()
    } catch (e) {
      console.error('Error saving record', e)
      setSnack({ open:true, message: 'Error guardando registro: ' + e.message })
    }
  }

  return (
    <Paper sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Registros</Typography>

        <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
          <TextField label="Desde" type="date" value={start} onChange={e => setStart(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Hasta" type="date" value={end} onChange={e => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" onClick={fetchRecords}>Actualizar</Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <List>
          {records.length === 0 && <Typography>No hay registros en este intervalo.</Typography>}
          {records.map(r => (
            <React.Fragment key={r.id}>
              <ListItem alignItems="flex-start">
                <ListItemText primary={`${r.type} — ${new Date(r.ts?.toDate ? r.ts.toDate() : r.ts).toLocaleString()}`} secondary={r.data ? JSON.stringify(r.data) : ''} />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>

        <Fab variant="extended" color="primary" sx={{ position: 'fixed', right: 16, bottom: 'calc(var(--bottom-offset) + 16px)' }} onClick={() => setFormOpen(true)}>
          <AddIcon sx={{ mr: 1 }} /> Añadir registro
        </Fab>

        <RecordForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveRecord} userProfile={profile} />

        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open:false })} message={snack.message} />
      </Box>
    </Paper>
  )
}
