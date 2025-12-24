import React, { useContext, useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Button,
  CircularProgress,
  Alert
} from '@mui/material'
import { AuthContext } from '../App'
import { getUserProfile, getUserRecords, getUserRecordExtreme } from '../firebaseClient'
import { generatePDFReport, generateExcelReport } from '../utils/reportGenerator'

// Use the exact type strings used by RecordForm.jsx so filtering matches saved records
const RECORD_TYPES = [
  { key: 'Glucosa', label: 'Glucosa' },
  { key: 'Medicación', label: 'Medicación' },
  { key: 'Alimentación', label: 'Alimentación' },
  { key: 'Presión arterial', label: 'Presión arterial' },
  { key: 'Actividad', label: 'Actividad' }
]

export default function Informes() {
  const { user } = useContext(AuthContext)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [types, setTypes] = useState(() => RECORD_TYPES.reduce((acc, r) => ({ ...acc, [r.key]: true }), {}))
  const [format, setFormat] = useState('pdf')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [yearsList, setYearsList] = useState(() => {
    const now = new Date().getFullYear()
    const arr = []
    for (let y = now; y >= now - 5; y--) arr.push(y)
    return arr
  })

  // When user changes, fetch records briefly to compute oldest/newest year range
  useEffect(() => {
    let mounted = true
    async function computeYearRange() {
      if (!user || !user.email) return
      try {
        // Fetch only the oldest and newest records (limit 1 each) to compute year range
        const newest = await getUserRecordExtreme(user.email, 'desc')
        const oldest = await getUserRecordExtreme(user.email, 'asc')
        if (!mounted) return
        if (!newest && !oldest) return
        const maxTs = newest && newest.ts ? (typeof newest.ts.toDate === 'function' ? newest.ts.toDate() : (newest.ts.seconds ? new Date(newest.ts.seconds * 1000) : new Date(newest.ts))) : null
        const minTs = oldest && oldest.ts ? (typeof oldest.ts.toDate === 'function' ? oldest.ts.toDate() : (oldest.ts.seconds ? new Date(oldest.ts.seconds * 1000) : new Date(oldest.ts))) : null
        if (minTs && maxTs) {
          const minYear = minTs.getFullYear()
          const maxYear = maxTs.getFullYear()
          const arr = []
          for (let y = maxYear; y >= minYear; y--) arr.push(y)
          if (mounted) {
            setYearsList(arr)
            if (year < minYear || year > maxYear) setYear(maxYear)
          }
        }
      } catch (e) {
        console.warn('No se pudo calcular rango de años:', e)
      }
    }
    computeYearRange()
    return () => { mounted = false }
  }, [user])

  const handleTypeChange = (key) => (ev) => setTypes(prev => ({ ...prev, [key]: ev.target.checked }))

  function normalizeTypeString(s) {
    if (!s) return ''
    try {
      return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[\s]+/g, ' ').trim()
    } catch (e) {
      // fallback without unicode property escape
      return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s]+/g, ' ').trim()
    }
  }

  const handleGenerate = async () => {
    setError(null)
    if (!user || !user.email) {
      setError('Usuario no autenticado')
      return
    }
    setLoading(true)
    try {
      const fromDate = new Date(year, Number(month) - 1, 1, 0, 0, 0)
      const toDate = new Date(year, Number(month), 0, 23, 59, 59)
      const profile = await getUserProfile(user.email)
      const records = await getUserRecords(user.email, fromDate, toDate)
      // filter by selected types
      const selectedKeys = Object.keys(types).filter(k => types[k])
      const selectedNorms = selectedKeys.map(k => normalizeTypeString(k))
      const filtered = records.filter(r => {
        const rawType = (r.type || r.tipo || '')
        const tnorm = normalizeTypeString(rawType)
        // if no types selected, include all; otherwise include when normalized type matches any selected normalized key
        return selectedNorms.length === 0 ? true : selectedNorms.includes(tnorm)
      })

      if (format === 'pdf') {
        await generatePDFReport(profile || {}, filtered, { month, year })
      } else {
        await generateExcelReport(profile || {}, filtered, { month, year })
      }
    } catch (e) {
      console.error(e)
      setError('Error generando el informe: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper elevation={0} sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Informes</Typography>
        <Typography sx={{ mb: 2 }}>Genera reportes mensuales en PDF o Excel. Selecciona mes, año y tipos de registro.</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField select label="Mes" fullWidth value={month} onChange={e => setMonth(e.target.value)}>
              {(() => {
                const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
                return MONTHS.map((name, i) => (
                  <MenuItem key={i} value={i + 1}>{`${i + 1} - ${name}`}</MenuItem>
                ))
              })()}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField select label="Año" fullWidth value={year} onChange={e => setYear(e.target.value)}>
              {yearsList.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography>Seleccionar tipos de registro</Typography>
            <FormGroup row>
              {RECORD_TYPES.map(r => (
                <FormControlLabel
                  key={r.key}
                  control={<Checkbox checked={!!types[r.key]} onChange={handleTypeChange(r.key)} />}
                  label={r.label}
                />
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography>Formato de descarga</Typography>
            <RadioGroup row value={format} onChange={e => setFormat(e.target.value)}>
              <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
              <FormControlLabel value="excel" control={<Radio />} label="Excel" />
            </RadioGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" onClick={handleGenerate} disabled={loading}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Generar y descargar'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  )
}
