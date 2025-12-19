import React, { useContext, useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  Fab,
  Zoom, 
  Paper,
  Snackbar,
  Stack,
    Tooltip
} from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import { AuthContext } from '../App'
import { signOut } from '../firebaseClient'
import { useThemePreference } from '../theme'
import defaultProfile from '../defaultProfile'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import WcIcon from '@mui/icons-material/Wc'
import OpacityIcon from '@mui/icons-material/Opacity'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import MedicationIcon from '@mui/icons-material/Medication'
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight'
import HeightIcon from '@mui/icons-material/Height'
import ScienceIcon from '@mui/icons-material/Science'

  import SaveIcon from '@mui/icons-material/Save'
  import CloseIcon from '@mui/icons-material/Close'
  import LogoutIcon from '@mui/icons-material/Logout'
function AccountTab() {
  const { user, setUser } = useContext(AuthContext)
  const [profile, setProfile] = useState(null)
  const [originalProfile, setOriginalProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '' })

  function showSnack(message) {
    setSnack({ open: true, message })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user?.email) return
      setLoadingProfile(true)
      try {
        const p = await import('../firebaseClient.js').then(mod => mod.getUserProfile(user.email))
        const merged = { ...defaultProfile, ...(p || {}) }
        if (mounted) {
          setProfile(merged)
          setOriginalProfile(merged)
        }
      } catch (e) {
        console.error('Error loading profile', e)
      } finally {
        if (mounted) setLoadingProfile(false)
      }
    })()
    return () => (mounted = false)
  }, [user])

  async function handleSignOut() {
    try {
      await signOut()
      setUser(null)
    } catch (e) {
      console.error('Error signing out', e)
    }
  }

  async function handleSave() {
    if (!user?.email) return
    try {
      const save = await import('../firebaseClient.js').then(mod => mod.saveUserProfile)
      const res = await save(user.email, profile || {})
      setOriginalProfile(profile)
      if (res && res.offline) showSnack('Guardado localmente — se sincronizará cuando haya conexión')
      else showSnack('Perfil guardado')
    } catch (e) {
      console.error('Error saving profile', e)
      showSnack('Error guardando perfil: ' + e.message)
    }
  }

  function setField(path, value) {
    setProfile(prev => ({ ...(prev || {}), [path]: value }))
  }

  function setGlucoseField(field, value) {
    setProfile(prev => {
      const p = { ...(prev || {}) }
      const parse = v => (v === '' || v === null ? '' : Number(v))
      const muyBajoFixed = p.unidadGlucosa === 'mg/dL' ? 54 : 3

      if (field === 'muyAlto') {
        p.muyAlto = parse(value)
        // ensure intervaloIdealMax <= muyAlto
        if (p.intervaloIdealMax !== '' && p.intervaloIdealMax !== undefined && p.muyAlto !== '' && p.intervaloIdealMax > p.muyAlto) {
          p.intervaloIdealMax = p.muyAlto
        }
        // ensure intervaloIdealMin <= intervaloIdealMax
        if (p.intervaloIdealMin !== '' && p.intervaloIdealMax !== '' && p.intervaloIdealMin > p.intervaloIdealMax) {
          p.intervaloIdealMin = p.intervaloIdealMax
        }
      } else if (field === 'intervaloIdealMax') {
        p.intervaloIdealMax = parse(value)
        // clamp to <= muyAlto if muyAlto defined
        if (p.muyAlto !== '' && p.muyAlto !== undefined && p.intervaloIdealMax !== '' && p.intervaloIdealMax > p.muyAlto) {
          p.intervaloIdealMax = p.muyAlto
        }
        // ensure >= intervaloIdealMin
        if (p.intervaloIdealMin !== '' && p.intervaloIdealMin !== undefined && p.intervaloIdealMax !== '' && p.intervaloIdealMax < p.intervaloIdealMin) {
          p.intervaloIdealMax = p.intervaloIdealMin
        }
      } else if (field === 'intervaloIdealMin') {
        p.intervaloIdealMin = parse(value)
        // clamp to >= muyBajoFixed
        if (p.intervaloIdealMin !== '' && p.intervaloIdealMin !== undefined && p.intervaloIdealMin < muyBajoFixed) {
          p.intervaloIdealMin = muyBajoFixed
        }
        // ensure <= intervaloIdealMax
        if (p.intervaloIdealMax !== '' && p.intervaloIdealMax !== undefined && p.intervaloIdealMin !== '' && p.intervaloIdealMin > p.intervaloIdealMax) {
          p.intervaloIdealMin = p.intervaloIdealMax
        }
      }
      return p
    })
  }

  // Medication helpers
  function addMedication(name) {
    if (!name) return
    const list = profile?.medicamentos ? [...profile.medicamentos] : []
    list.push(name)
    setField('medicamentos', list)
  }

  function removeMedication(idx) {
    if (!confirm('¿Eliminar medicamento?')) return
    const list = (profile?.medicamentos || []).filter((_, i) => i !== idx)
    setField('medicamentos', list)
  }

  // Conversion helpers
  function mgdlToMmoll(v) {
    // Convert mg/dL to mmol/L and round to 0.1 (one decimal)
    return Number((v / 18).toFixed(1))
  }
  function mmollToMgdl(v) {
    // Convert mmol/L to mg/dL and round to nearest 10
    return Math.round((v * 18) / 10) * 10
  }

  function kgToLbs(v) {
    return Number((v * 2.20462).toFixed(1))
  }
  function lbsToKg(v) {
    return Number((v / 2.20462).toFixed(1))
  }

  function cmToFt(v) {
    return Number((v / 30.48).toFixed(2))
  }
  function ftToCm(v) {
    return Number((v * 30.48).toFixed(0))
  }

  function a1cNgspToIfcc(v) {
    return Math.round((10.93 * v - 23.5) * 10) / 10
  }
  function a1cIfccToNgsp(v) {
    return Math.round(((v + 23.5) / 10.93) * 10) / 10
  }

  if (!user) return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6">Cuenta</Typography>
      <Typography sx={{ mt: 2 }}>No hay sesión iniciada.</Typography>
    </Box>
  )


  const local = profile || {}
  const dirty = JSON.stringify(profile || {}) !== JSON.stringify(originalProfile || {})

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6">Cuenta</Typography>
      <Typography>Email: {user.email}</Typography>
      <Typography>Nombre: {user.displayName || ''}</Typography>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LocalHospitalIcon sx={{ mr: 1, color: 'action.active' }} />
          <FormControl fullWidth sx={{ flex: 1 }}>
            <InputLabel>Tipo de diabetes</InputLabel>
            <Select value={local.tipoDiabetes || 'Sin especificar'} label="Tipo de diabetes" onChange={e => setField('tipoDiabetes', e.target.value)}>
              {['Sin especificar','Tipo 1','Tipo 2','LADA','MODY','Diabetes gestacional','Otro'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CalendarTodayIcon sx={{ mr: 1, color: 'action.active' }} />
          <TextField label="Año de diagnóstico" type="number" value={local.anoDiagnostico || ''} onChange={e => setField('anoDiagnostico', e.target.value)} sx={{ flex: 1 }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WcIcon sx={{ mr: 1, color: 'action.active' }} />
          <FormControl fullWidth sx={{ flex: 1 }}>
            <InputLabel>Sexo</InputLabel>
            <Select value={local.sexo || 'Sin especificar'} label="Sexo" onChange={e => setField('sexo', e.target.value)}>
              {['Sin especificar','Mujer','Hombre'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <OpacityIcon sx={{ mr: 1, color: 'action.active' }} />
          <FormControl fullWidth sx={{ flex: 1 }}>
            <InputLabel>Terapia de insulina</InputLabel>
            <Select value={local.terapiaInsulina || 'Sin especificar'} label="Terapia de insulina" onChange={e => setField('terapiaInsulina', e.target.value)}>
              {['Sin especificar','Boligrafo / jeringas','Bomba','Sin insulina'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <OpacityIcon sx={{ mr: 1, color: 'action.active' }} />
          <FormControl fullWidth sx={{ flex: 1 }}>
            <InputLabel>Unidad de glucosa</InputLabel>
            <Select value={local.unidadGlucosa || 'mg/dL'} label="Unidad de glucosa" onChange={e => {
            const newUnit = e.target.value
            // convert indicators
            const prev = local.unidadGlucosa || 'mg/dL'
            let p = { ...(local || {}) }
            if (prev !== newUnit) {
              if (prev === 'mg/dL' && newUnit === 'mmol/L') {
                if (p.muyAlto) p.muyAlto = mgdlToMmoll(p.muyAlto)
                if (p.intervaloIdealMax) p.intervaloIdealMax = mgdlToMmoll(p.intervaloIdealMax)
                if (p.intervaloIdealMin) p.intervaloIdealMin = mgdlToMmoll(p.intervaloIdealMin)
                // Muy bajo fixed at 3 mmol/L
                p.muyBajo = 3
              } else if (prev === 'mmol/L' && newUnit === 'mg/dL') {
                if (p.muyAlto) p.muyAlto = mmollToMgdl(p.muyAlto)
                if (p.intervaloIdealMax) p.intervaloIdealMax = mmollToMgdl(p.intervaloIdealMax)
                if (p.intervaloIdealMin) p.intervaloIdealMin = mmollToMgdl(p.intervaloIdealMin)
                // Muy bajo fixed at 54 mg/dL
                p.muyBajo = 54
              }
              p.unidadGlucosa = newUnit
              setProfile(p)
            } else {
              setField('unidadGlucosa', newUnit)
            }
            }}>
              {['mg/dL','mmol/L'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RestaurantIcon sx={{ mr: 1, color: 'action.active' }} />
          <FormControl fullWidth sx={{ flex: 1 }}>
            <InputLabel>Unidad de carbohidratos</InputLabel>
            <Select value={local.unidadCarbohidratos || 'Gramos'} label="Unidad de carbohidratos" onChange={e => setField('unidadCarbohidratos', e.target.value)}>
              {['Gramos','Exchanges'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MedicationIcon sx={{ mr: 1, color: 'action.active' }} />
            <Typography variant="subtitle1">Medicamentos</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField id="med-name" label="Nombre" size="small" sx={{ flex: 1 }} />
            <Button onClick={() => {
              const el = document.getElementById('med-name')
              if (el) { const v = el.value; if (v) { addMedication(v); el.value = '' } }
            }}>Añadir</Button>
          </Box>
          <Box sx={{ mt: 1 }}>
            {(local.medicamentos || []).map((m, i) => (
              <Chip key={i} label={m} onDelete={() => removeMedication(i)} sx={{ mr: 1, mb: 1 }} />
            ))}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <OpacityIcon sx={{ mr: 1, color: 'action.active' }} />
          <Typography variant="subtitle1">Indicadores de glucosa ({local.unidadGlucosa || 'mg/dL'})</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField label="Intervalo ideal - máximo" type="number" color="success" focused inputProps={{ step: local.unidadGlucosa === 'mg/dL' ? 10 : 0.1 }} value={local.intervaloIdealMax || ''} onChange={e => setGlucoseField('intervaloIdealMax', e.target.value)} sx={{ flex: 1 }} />
          <TextField label="Intervalo ideal - mínimo" type="number" color="success" focused inputProps={{ step: local.unidadGlucosa === 'mg/dL' ? 10 : 0.1 }} value={local.intervaloIdealMin || ''} onChange={e => setGlucoseField('intervaloIdealMin', e.target.value)} sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField label="Muy alto" type="number" error inputProps={{ step: local.unidadGlucosa === 'mg/dL' ? 10 : 0.1 }} value={local.muyAlto || ''} onChange={e => setGlucoseField('muyAlto', e.target.value)} sx={{ flex: 1 }} />
          <TextField label="Muy bajo" type="number" error value={local.unidadGlucosa === 'mg/dL' ? 54 : 3} sx={{ flex: 1 }} disabled />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <MonitorWeightIcon sx={{ mr: 1, color: 'action.active' }} />
          <TextField label="Peso deseado" type="number" value={local.pesoDeseado || ''} onChange={e => setField('pesoDeseado', e.target.value ? Number(e.target.value) : '')} sx={{ flex: 1 }} />
          <FormControl sx={{ width: 140 }}>
            <InputLabel>Unidad de peso</InputLabel>
            <Select value={local.unidadPeso || 'kg'} label="Unidad de peso" onChange={e => {
              const newUnit = e.target.value
              const prev = local.unidadPeso || 'kg'
              let p = { ...(local || {}) }
              if (prev !== newUnit) {
                if (prev === 'kg' && newUnit === 'lbs') {
                  if (p.pesoDeseado) p.pesoDeseado = kgToLbs(p.pesoDeseado)
                } else if (prev === 'lbs' && newUnit === 'kg') {
                  if (p.pesoDeseado) p.pesoDeseado = lbsToKg(p.pesoDeseado)
                }
                p.unidadPeso = newUnit
                setProfile(p)
              } else {
                setField('unidadPeso', newUnit)
              }
            }}>
              {['kg','lbs'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <HeightIcon sx={{ mr: 1, color: 'action.active' }} />
          <TextField label="Altura" type="number" value={local.altura || ''} onChange={e => setField('altura', e.target.value ? Number(e.target.value) : '')} sx={{ flex: 1 }} />
          <FormControl sx={{ width: 140 }}>
            <InputLabel>Unidad de altura</InputLabel>
            <Select value={local.unidadAltura || 'cm'} label="Unidad de altura" onChange={e => {
              const newUnit = e.target.value
              const prev = local.unidadAltura || 'cm'
              let p = { ...(local || {}) }
              if (prev !== newUnit) {
                if (prev === 'cm' && newUnit === 'ft') {
                  if (p.altura) p.altura = cmToFt(p.altura)
                } else if (prev === 'ft' && newUnit === 'cm') {
                  if (p.altura) p.altura = ftToCm(p.altura)
                }
                p.unidadAltura = newUnit
                setProfile(p)
              } else {
                setField('unidadAltura', newUnit)
              }
            }}>
              {['cm','ft'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ScienceIcon sx={{ mr: 1, color: 'action.active' }} />
          <TextField label="HbA1c" type="number" value={local.hba1c || ''} onChange={e => setField('hba1c', e.target.value ? Number(e.target.value) : '')} sx={{ flex: 1 }} />
          <FormControl sx={{ width: 140 }}>
            <InputLabel>Unidad HbA1c</InputLabel>
            <Select value={local.unidadHbA1c || '%'} label="Unidad HbA1c" onChange={e => {
              const newUnit = e.target.value
              const prev = local.unidadHbA1c || '%'
              let p = { ...(local || {}) }
              if (prev !== newUnit) {
                if (prev === '%' && newUnit === 'mmol/mol') {
                  if (p.hba1c) p.hba1c = a1cNgspToIfcc(p.hba1c)
                } else if (prev === 'mmol/mol' && newUnit === '%') {
                  if (p.hba1c) p.hba1c = a1cIfccToNgsp(p.hba1c)
                }
                p.unidadHbA1c = newUnit
                setProfile(p)
              } else {
                setField('unidadHbA1c', newUnit)
              }
            }}>
              {['%','mmol/mol'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

            <Stack>
              {/* FABs: Discard (small) above Save (extended) - only show when dirty */}
              {dirty && (
                <>
                  <Zoom in={dirty}>
                    <Tooltip title="Descartar cambios" placement="left">
                      <Fab
                        color="default"
                        size="small"
                        aria-label="descartar"
                        sx={{ position: 'fixed', right: 16, bottom: 'calc(var(--bottom-offset) + 96px)' }}
                        onClick={() => { if (originalProfile) setProfile(originalProfile); else setProfile(null); }}
                      >
                        <UndoIcon />
                      </Fab>
                    </Tooltip>
                  </Zoom>

                  <Zoom in={dirty}>
                    <Fab
                      variant="extended"
                      color="primary"
                      aria-label="guardar"
                      sx={{ position: 'fixed', right: 16, bottom: 'calc(var(--bottom-offset) + 16px)' }}
                      onClick={handleSave}
                    >
                      <SaveIcon sx={{ mr: 1 }} /> Guardar
                    </Fab>
                  </Zoom>
                </>
              )}
            </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />
      <Box sx={{ px: 0 }}>
        <Button variant="outlined" color="error" fullWidth startIcon={<LogoutIcon />} onClick={handleSignOut}>
          Cerrar sesión
        </Button>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        message={snack.message}
      />
    </Box>
  )
}

function AjustesTab() {
  const { preference, setPreference } = useThemePreference()
  const [value, setValue] = useState(preference || 'system')

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    setPreference(v)
  }

  return (
    <Box sx={{ p: 3 }}>

      <Typography variant="subtitle1">Tema</Typography>
      <RadioGroup value={value} onChange={handleChange}>
        <FormControlLabel value="system" control={<Radio />} label="Sistema" />
        <FormControlLabel value="light" control={<Radio />} label="Claro" />
        <FormControlLabel value="dark" control={<Radio />} label="Oscuro" />
      </RadioGroup>
      <Divider sx={{ my: 2 }} />
    </Box>
  )
}

export default function Configuracion() {
  const [tab, setTab] = useState(0)

  return (
    <Paper sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
      <Tabs value={tab} variant="fullWidth" onChange={(e, v) => setTab(v) }>
        <Tab label="Cuenta" />
        <Tab label="Ajustes" />
      </Tabs>

      {tab === 0 && <AccountTab />}
      {tab === 1 && <AjustesTab />}
    </Paper>
  )
}
