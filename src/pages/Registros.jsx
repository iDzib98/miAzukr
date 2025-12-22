import React, { useContext, useState, useEffect } from 'react'
import { Box, Typography, Paper, TextField, Button, Fab, Divider, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Skeleton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import { AuthContext } from '../App'
import { getUserProfile, getUserRecords, saveUserRecord, updateUserRecord, deleteUserRecord } from '../firebaseClient'
import defaultProfile from '../defaultProfile'
import RecordForm from '../components/RecordForm'
import Registro from '../components/Registro'

function formatDateInput(d) {
  const dt = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return dt
}

export default function Registros() {
  const { user } = useContext(AuthContext)
  const [profile, setProfile] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [start, setStart] = useState(formatDateInput(new Date(Date.now() - 30*24*60*60*1000)))
  const [end, setEnd] = useState(formatDateInput(new Date()))
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [snack, setSnack] = useState({ open:false, message: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState(null)

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
      setLoading(true)
      // ensure start includes start of local day and end includes end of local day
      console.log('Fetching records for', user.email, 'from', start, 'to', end)
      const from = start ? (() => { const [y, m, d] = start.split('-').map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0) })() : null
      const to = end ? (() => { const [y, m, d] = end.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59, 999) })() : null
      const res = await getUserRecords(user.email, from, to)
      setRecords(res)
    } catch (e) {
      console.error('Error fetching records', e)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [user, start, end])

  async function handleSaveRecord(rec) {
    if (!user?.email) return
    try {
      if (editingRecord && editingRecord.id) {
        const res = await updateUserRecord(user.email, editingRecord.id, rec)
        if (res && res.offline) setSnack({ open:true, message: 'Registro actualizado localmente; se sincronizará más tarde' })
        else setSnack({ open:true, message: 'Registro actualizado' })
        setEditingRecord(null)
        setFormOpen(false)
        fetchRecords()
      } else {
        const res = await saveUserRecord(user.email, rec)
        if (res && res.offline) setSnack({ open:true, message: 'Registro guardado localmente; se sincronizará más tarde' })
        else setSnack({ open:true, message: 'Registro guardado' })
        setFormOpen(false)
        fetchRecords()
      }
    } catch (e) {
      console.error('Error saving record', e)
      setSnack({ open:true, message: 'Error guardando registro: ' + e.message })
    }
  }

  async function handleEditRecord(rec) {
    setEditingRecord(rec)
    setFormOpen(true)
  }

  function handleDeleteRecord(rec) {
    // open confirmation dialog
    setRecordToDelete(rec)
    setConfirmOpen(true)
  }

  function cancelDelete() {
    setConfirmOpen(false)
    setRecordToDelete(null)
  }

  async function confirmDelete() {
    if (!user?.email || !recordToDelete) {
      cancelDelete()
      return
    }
    try {
      const res = await deleteUserRecord(user.email, recordToDelete.id)
      if (res && res.offline) setSnack({ open:true, message: 'Registro eliminado localmente; se sincronizará más tarde' })
      else setSnack({ open:true, message: 'Registro eliminado' })
      cancelDelete()
      fetchRecords()
    } catch (e) {
      console.error('Error deleting record', e)
      setSnack({ open:true, message: 'Error eliminando registro: ' + e.message })
      cancelDelete()
    }
  }

  return (
    <Paper elevation={0} sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Registros</Typography>

        <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
          <TextField label="Desde" type="date" value={start} onChange={e => setStart(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Hasta" type="date" value={end} onChange={e => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchRecords} aria-label="Actualizar" size="large">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
          </Box>
        ) : (
          records.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <InboxOutlinedIcon sx={{ fontSize: 72, mb: 2 }} />
              <Typography variant="h6">No hay registros</Typography>
              <Typography variant="body2">No se encontraron registros en este intervalo.</Typography>
            </Box>
          ) : (
            records.map(r => (
              <Box key={r.id}>
                <Registro record={r} userProfile={{ ...defaultProfile, ...(profile || {}) }} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />
              </Box>
            ))
          )
        )}

        <Fab variant="extended" color="primary" sx={{ position: 'fixed', right: 16, bottom: 'calc(var(--bottom-offset) + 16px)' }} onClick={() => setFormOpen(true)}>
          <AddIcon sx={{ mr: 1 }} /> Añadir registro
        </Fab>

        <RecordForm open={formOpen} onClose={() => { setFormOpen(false); setEditingRecord(null) }} onSave={handleSaveRecord} userProfile={profile} initialRecord={editingRecord} />

        <Dialog open={confirmOpen} onClose={cancelDelete}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Eliminar este registro?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Cancelar</Button>
            <Button color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open:false })} message={snack.message} />
      </Box>
    </Paper>
  )
}
