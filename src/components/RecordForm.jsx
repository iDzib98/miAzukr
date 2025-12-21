import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Stack
} from '@mui/material'

const glucoseMoments = ['En ayuno','Antes de comer','Después de comer','Antes de dormir']
const glucoseSymptoms = ['Mareo','Cansancio','Visión borrosa']
const mealTypes = ['Desayuno','Almuerzo','Cena','Snack','Colación']
const activityTypes = ['Caminar','Correr','Gimnasio','Yoga']
const intensityLevels = ['Ligera','Moderada','Intensa']

export default function RecordForm({ open, onClose, onSave, userProfile, initialRecord = null }) {
  function toLocalInputValue(d) {
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${mo}-${da}T${hh}:${mm}`
  }
  const nowLocal = toLocalInputValue(new Date())
  const [type, setType] = useState('Glucosa')
  const [datetime, setDatetime] = useState(nowLocal)
  const [notes, setNotes] = useState('')

  // glucose specific
  const [glucoseLevel, setGlucoseLevel] = useState('')
  const [glucoseUnit, setGlucoseUnit] = useState((userProfile && userProfile.unidadGlucosa) || 'mg/dL')
  const [glucoseMoment, setGlucoseMoment] = useState(glucoseMoments[0])
  const [glucoseSymptomsSel, setGlucoseSymptomsSel] = useState([])

  // comida
  const [mealType, setMealType] = useState(mealTypes[0])
  const [mealDesc, setMealDesc] = useState('')
  const [mealCarbs, setMealCarbs] = useState('')

  // actividad
  const [activityType, setActivityType] = useState(activityTypes[0])
  const [activityDuration, setActivityDuration] = useState('')
  const [activityIntensity, setActivityIntensity] = useState(intensityLevels[0])

  // medicacion
  const meds = (userProfile && userProfile.medicamentos) || []
  const [medType, setMedType] = useState(meds.length ? meds[0] : '')
  const [medDose, setMedDose] = useState('')

  useEffect(() => {
    if (open) {
      if (initialRecord) {
        // populate fields from initialRecord
        const rec = initialRecord
        const ts = rec.ts && rec.ts.toDate ? rec.ts.toDate() : (rec.ts instanceof Date ? rec.ts : new Date(rec.ts))
        setType(rec.type || 'Glucosa')
        setDatetime(toLocalInputValue(ts || new Date()))
        setNotes(rec.notes || '')
        setGlucoseLevel(rec.data?.level ?? '')
        setGlucoseUnit(rec.data?.unit || ((userProfile && userProfile.unidadGlucosa) || 'mg/dL'))
        setGlucoseMoment(rec.data?.moment || glucoseMoments[0])
        setGlucoseSymptomsSel(rec.data?.symptoms ? (String(rec.data.symptoms).split(',').map(s => s.trim()).filter(Boolean)) : [])
        setMealType(rec.data?.mealType || mealTypes[0])
        setMealDesc(rec.data?.description || '')
        setMealCarbs(rec.data?.carbs ?? '')
        setActivityType(rec.data?.activityType || activityTypes[0])
        setActivityDuration(rec.data?.durationMin ?? '')
        setActivityIntensity(rec.data?.intensity || intensityLevels[0])
        setMedType(rec.data?.medType || (meds.length ? meds[0] : ''))
        setMedDose(rec.data?.dose ?? '')
      } else {
        setType('Glucosa')
        setDatetime(nowLocal)
        setNotes('')
        setGlucoseLevel('')
        setGlucoseUnit((userProfile && userProfile.unidadGlucosa) || 'mg/dL')
        setGlucoseMoment(glucoseMoments[0])
        setGlucoseSymptomsSel([])
        setMealType(mealTypes[0])
        setMealDesc('')
        setMealCarbs('')
        setActivityType(activityTypes[0])
        setActivityDuration('')
        setActivityIntensity(intensityLevels[0])
        setMedType(meds.length ? meds[0] : '')
        setMedDose('')
      }
    }
  }, [open, initialRecord])

  function handleSave() {
    // parse datetime-local value as local time (avoid Date(..) ambiguous parsing)
    // expected format: YYYY-MM-DDTHH:mm
    let tsDate = new Date()
    try {
      const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})/.exec(datetime)
      if (m) {
        const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]), hh = Number(m[4]), mm = Number(m[5])
        tsDate = new Date(y, mo, d, hh, mm, 0, 0)
      } else {
        tsDate = new Date(datetime)
      }
    } catch (e) {
      tsDate = new Date(datetime)
    }
    const base = { ts: tsDate, type, notes }
    let payload = { ...base }
    // include id when editing
    if (initialRecord && initialRecord.id) payload.id = initialRecord.id
    if (type === 'Glucosa') {
      payload.data = {
        level: glucoseLevel === '' ? null : Number(glucoseLevel),
        unit: glucoseUnit,
        moment: glucoseMoment,
        symptoms: glucoseSymptomsSel.join(',')
      }
    } else if (type === 'Alimentación') {
      payload.data = { mealType, description: mealDesc, carbs: mealCarbs === '' ? null : Number(mealCarbs) }
    } else if (type === 'Actividad') {
      payload.data = { activityType, durationMin: activityDuration === '' ? null : Number(activityDuration), intensity: activityIntensity }
    } else if (type === 'Medicación') {
      payload.data = { medType, dose: medDose }
    }
    onSave(payload)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialRecord ? 'Editar registro' : 'Añadir registro'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Fecha y hora" type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} />

          <FormControl>
            <InputLabel>Tipo de registro</InputLabel>
            <Select value={type} label="Tipo de registro" onChange={e => setType(e.target.value)}>
              <MenuItem value="Glucosa">Medición de glucosa</MenuItem>
              <MenuItem value="Alimentación">Alimentación</MenuItem>
              <MenuItem value="Actividad">Actividad física</MenuItem>
              <MenuItem value="Medicación">Medicación</MenuItem>
            </Select>
          </FormControl>

          {type === 'Glucosa' && (
            <>
              <Stack direction="row" spacing={1}>
                <TextField label="Nivel de glucosa" type="number" value={glucoseLevel} onChange={e => setGlucoseLevel(e.target.value)} sx={{ flex: 1 }} />
                <FormControl sx={{ width: 160 }}>
                  <InputLabel>Unidad</InputLabel>
                  <Select value={glucoseUnit} label="Unidad" onChange={e => setGlucoseUnit(e.target.value)}>
                    <MenuItem value="mg/dL">mg/dL</MenuItem>
                    <MenuItem value="mmol/L">mmol/L</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <FormControl>
                <InputLabel>Momento</InputLabel>
                <Select value={glucoseMoment} label="Momento" onChange={e => setGlucoseMoment(e.target.value)}>
                  {glucoseMoments.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl>
                <InputLabel>Síntomas</InputLabel>
                <Select multiple value={glucoseSymptomsSel} onChange={e => setGlucoseSymptomsSel(e.target.value)} input={<OutlinedInput label="Síntomas" />} renderValue={selected => selected.join(', ')}>
                  {glucoseSymptoms.map(s => (
                    <MenuItem key={s} value={s}>
                      <Checkbox checked={glucoseSymptomsSel.indexOf(s) > -1} />
                      <ListItemText primary={s} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {type === 'Alimentación' && (
            <>
              <FormControl>
                <InputLabel>Tipo de comida</InputLabel>
                <Select value={mealType} label="Tipo de comida" onChange={e => setMealType(e.target.value)}>
                  {mealTypes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Descripción" value={mealDesc} onChange={e => setMealDesc(e.target.value)} />
              <TextField label="Carbohidratos (aprox)" type="number" value={mealCarbs} onChange={e => setMealCarbs(e.target.value)} />
            </>
          )}

          {type === 'Actividad' && (
            <>
              <FormControl>
                <InputLabel>Tipo de actividad</InputLabel>
                <Select value={activityType} label="Tipo de actividad" onChange={e => setActivityType(e.target.value)}>
                  {activityTypes.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Duración (min)" type="number" value={activityDuration} onChange={e => setActivityDuration(e.target.value)} />
              <FormControl>
                <InputLabel>Intensidad</InputLabel>
                <Select value={activityIntensity} label="Intensidad" onChange={e => setActivityIntensity(e.target.value)}>
                  {intensityLevels.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          )}

          {type === 'Medicación' && (
            <>
              <FormControl>
                <InputLabel>Medicamento</InputLabel>
                <Select value={medType} label="Medicamento" onChange={e => setMedType(e.target.value)}>
                  {meds.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Dosis" value={medDose} onChange={e => setMedDose(e.target.value)} />
            </>
          )}

          <TextField label="Notas" multiline minRows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}
