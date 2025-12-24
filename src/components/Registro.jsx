import React, { useState } from 'react'
import { Accordion, AccordionSummary, AccordionDetails, Typography, Stack, Chip, Box, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import OpacityIcon from '@mui/icons-material/Opacity'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import MedicationIcon from '@mui/icons-material/Medication'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

function formatTs(ts) {
  if (!ts) return ''
  let d
  if (ts.toDate && typeof ts.toDate === 'function') d = ts.toDate()
  else d = (ts instanceof Date) ? ts : new Date(ts)
  return d.toLocaleString("es-MX", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Registro({ record, compact = false, onEdit, onDelete, userProfile }) {
  const r = record || {}
  const { type, ts, data, notes } = r
  const subtitle = formatTs(ts)
  const [anchorEl, setAnchorEl] = useState(null)
  const menuOpen = Boolean(anchorEl)
        function handleMenuOpen(e) { 
          e.stopPropagation(); 
          setAnchorEl(e.currentTarget); 
        }
  function handleMenuClose() { setAnchorEl(null) }
  function handleEdit() { handleMenuClose(); onEdit && onEdit(r) }
  function handleDelete() { handleMenuClose(); onDelete && onDelete(r) }


  function renderContent() {
    if (!type) return null
    if (type === 'Glucosa') {
      const symptoms = data?.symptoms ? data.symptoms.split(',').map(s => s.trim()).filter(Boolean) : []
      return (
        <Stack spacing={1}>
          {symptoms.length > 0 && (
            <Box>
              {symptoms.map(s => <Chip key={s} label={s} size={compact ? 'small' : 'medium'} sx={{ mr: 0.5 }} />)}
            </Box>
          )}
        </Stack>
      )
    }

    if (type === 'Alimentación') {
      return (
        <Stack spacing={1}>
          <Typography variant="subtitle1">{data?.mealType || ''}</Typography>
          <Typography variant="body2">{data?.description || ''}</Typography>
          <Typography variant="body2">Carbohidratos: {data?.carbs ?? '—'}</Typography>
        </Stack>
      )
    }

    if (type === 'Actividad') {
      return (
        <Stack spacing={1}>
          <Typography variant="subtitle1">{data?.activityType || ''}</Typography>
          <Typography variant="body2">Duración: {data?.durationMin ?? '—'} min</Typography>
          <Typography variant="body2">Intensidad: {data?.intensity || '—'}</Typography>
        </Stack>
      )
    }

    if (type === 'Medicación' || type === 'MedicaciÃ³n') {
      return (
        <Stack spacing={1}>
          <Typography variant="subtitle1">{data?.medType || ''}</Typography>
          <Typography variant="body2">Dosis: {data?.dose ?? '—'}</Typography>
        </Stack>
      )
    }

      if (type === 'Presión arterial') {
        const symptoms = data?.symptoms ? data.symptoms.split(',').map(s => s.trim()).filter(Boolean) : []
        return (
          <Stack spacing={1}>
            <Typography variant="subtitle1">{data?.moment || 'Presión arterial'}</Typography>
            <Typography variant="body2">Sistólica: {data?.systolic ?? '—'} mmHg</Typography>
            <Typography variant="body2">Diastólica: {data?.diastolic ?? '—'} mmHg</Typography>
            {symptoms.length > 0 && (
              <Box>
                {symptoms.map(s => <Chip key={s} label={s} size={compact ? 'small' : 'medium'} sx={{ mr: 0.5 }} />)}
              </Box>
            )}
          </Stack>
        )
      }

    // default fallback: show JSON
    return (
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(data || {}, null, 2)}</pre>
    )
  }

  function pickIcon() {
    if (type === 'Glucosa') return <OpacityIcon />
    if (type === 'Alimentación') return <RestaurantIcon />
    if (type === 'Actividad') return <DirectionsRunIcon />
    if (type === 'Presión arterial') return <MonitorHeartIcon />
    return <MedicationIcon />
  }

  function getMeasurement() {
    if (type === 'Glucosa') {
      return data?.level ?? '—'
    }
    if (type === 'Alimentación') return data?.carbs ?? '—'
    if (type === 'Actividad') return data?.durationMin ?? '—'
    if (type === 'Medicación' || type === 'MedicaciÃ³n') return data?.dose ?? '—'
    if (type === 'Presión arterial') return (data && (data.systolic !== undefined || data.diastolic !== undefined)) ? `${data.systolic ?? '—'}/${data.diastolic ?? '—'}` : '—'
    return '—'
  }

  function getUnit() {
    if (type === 'Glucosa') return data?.unit || ''
    if (type === 'Alimentación') return 'g de carb'
    if (type === 'Actividad') return 'min'
    if (type === 'Medicación' || type === 'MedicaciÃ³n') return 'dosis'
    if (type === 'Presión arterial') return 'mmHg'
    return ''
  }

  function getMainTitle() {
    if (type === 'Glucosa') return data?.moment || 'Glucosa'
    if (type === 'Alimentación') return data?.mealType || 'Alimentación'
    if (type === 'Actividad') return data?.activityType || 'Actividad'
    if (type === 'Medicación' || type === 'MedicaciÃ³n') return data?.medType || 'Medicación'
    if (type === 'Presión arterial') return data?.moment || 'Presión arterial'
    return type || ''
  }

  // Conversion & display helpers for glucose
  const preferredUnit = (userProfile && userProfile.unidadGlucosa) || 'mg/dL'
  function mgdlToMmoll(v) {
    return Number((v / 18).toFixed(1))
  }
  function mmollToMgdl(v) {
    return Math.round(v * 18)
  }

  const measurement = getMeasurement()
  const unit = getUnit()
  const mainTitle = getMainTitle()

  // Prepare display values (possibly converted) and color coding
  let displayMeasurement = measurement
  let displayUnit = unit
  let colorKey = 'text.primary'

  if (type === 'Glucosa') {
    const storedUnit = (data && data.unit) || preferredUnit
    const raw = (data && (data.level !== undefined ? data.level : null))
    if (raw === null || raw === undefined || raw === '' || raw === '—') {
      displayMeasurement = '—'
      displayUnit = preferredUnit
    } else {
      const num = Number(raw)
      if (isNaN(num)) {
        displayMeasurement = raw
        displayUnit = preferredUnit
      } else {
        let valInPreferred
        if (storedUnit === preferredUnit) valInPreferred = num
        else if (storedUnit === 'mg/dL' && preferredUnit === 'mmol/L') valInPreferred = mgdlToMmoll(num)
        else if (storedUnit === 'mmol/L' && preferredUnit === 'mg/dL') valInPreferred = mmollToMgdl(num)
        else valInPreferred = num

        // format for display
        if (preferredUnit === 'mmol/L') displayMeasurement = Number(valInPreferred).toFixed(1)
        else displayMeasurement = String(Math.round(valInPreferred))
        displayUnit = preferredUnit

        // thresholds come from userProfile and are expected in preferred unit
        const p = userProfile || {}
        const min = Number(p.intervaloIdealMin)
        const max = Number(p.intervaloIdealMax)
        const muyAlto = Number(p.muyAlto)
        const muyBajo = Number(p.muyBajo)
        const valNum = Number(valInPreferred)

        if (!isNaN(valNum)) {
          if ((!isNaN(muyAlto) && valNum >= muyAlto) || (!isNaN(muyBajo) && valNum <= muyBajo)) {
            colorKey = 'error.main'
          } else if (!isNaN(min) && !isNaN(max) && valNum >= min && valNum <= max) {
            colorKey = 'success.main'
          } else {
            colorKey = 'warning.main'
          }
        }
      }
    }
  }

  // Color coding for blood pressure
  if (type === 'Presión arterial') {
    const p = userProfile || {}
    const sysRaw = data && (data.systolic !== undefined ? data.systolic : null)
    const diaRaw = data && (data.diastolic !== undefined ? data.diastolic : null)
    const sys = (sysRaw === null || sysRaw === '') ? null : Number(sysRaw)
    const dia = (diaRaw === null || diaRaw === '') ? null : Number(diaRaw)

    const sysHigh = Number(p.paSistolicaAlto)
    const sysLow = Number(p.paSistolicaBajo)
    const sysMin = Number(p.paSistolicaIdealMin)
    const sysMax = Number(p.paSistolicaIdealMax)

    const diaHigh = Number(p.paDiastolicaAlto)
    const diaLow = Number(p.paDiastolicaBajo)
    const diaMin = Number(p.paDiastolicaIdealMin)
    const diaMax = Number(p.paDiastolicaIdealMax)

    if ((sys !== null && !isNaN(sys)) || (dia !== null && !isNaN(dia))) {
      // If either value is in a danger zone (high or low) -> red
      const isDanger = (sys !== null && !isNaN(sys) && ((!isNaN(sysHigh) && sys >= sysHigh) || (!isNaN(sysLow) && sys <= sysLow))) ||
                       (dia !== null && !isNaN(dia) && ((!isNaN(diaHigh) && dia >= diaHigh) || (!isNaN(diaLow) && dia <= diaLow)))

      // If both present and both within ideal ranges -> green
      const isIdeal = (sys !== null && !isNaN(sys) ? (!isNaN(sysMin) && !isNaN(sysMax) && sys >= sysMin && sys <= sysMax) : true) &&
                      (dia !== null && !isNaN(dia) ? (!isNaN(diaMin) && !isNaN(diaMax) && dia >= diaMin && dia <= diaMax) : true)

      if (isDanger) colorKey = 'error.main'
      else if (isIdeal) colorKey = 'success.main'
      else colorKey = 'warning.main'
    }
  }

  return (
    <Accordion sx={{ my: 1 } } elevation={3}>
      <AccordionSummary expandIcon={null}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={type || ''}>
              {pickIcon()}
            </Tooltip>
            <Box>
              <Typography variant="subtitle1">{mainTitle}</Typography>
              <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" sx={{ color: colorKey }}>{displayMeasurement}</Typography>
              <Typography variant="caption">{displayUnit}</Typography>
            </Box>
            <Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleMenuOpen(e);
                }}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={(e) => { e?.stopPropagation && e.stopPropagation(); handleMenuClose(); }}
                MenuListProps={{ onClick: (e) => e.stopPropagation() }}
              >
                <MenuItem onClick={handleEdit}>Editar</MenuItem>
                <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
              </Menu>
              </Box>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {renderContent()}
        {notes && <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">{notes}</Typography>}
      </AccordionDetails>
    </Accordion>
  )
}
