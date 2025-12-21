import React, { useState } from 'react'
import { Accordion, AccordionSummary, AccordionDetails, Typography, Stack, Chip, Box, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import OpacityIcon from '@mui/icons-material/Opacity'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import MedicationIcon from '@mui/icons-material/Medication'
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

export default function Registro({ record, compact = false, onEdit, onDelete }) {
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

    // default fallback: show JSON
    return (
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(data || {}, null, 2)}</pre>
    )
  }

  function pickIcon() {
    if (type === 'Glucosa') return <OpacityIcon />
    if (type === 'Alimentación') return <RestaurantIcon />
    if (type === 'Actividad') return <DirectionsRunIcon />
    return <MedicationIcon />
  }

  function getMeasurement() {
    if (type === 'Glucosa') return data?.level ?? '—'
    if (type === 'Alimentación') return data?.carbs ?? '—'
    if (type === 'Actividad') return data?.durationMin ?? '—'
    if (type === 'Medicación' || type === 'MedicaciÃ³n') return data?.dose ?? '—'
    return '—'
  }

  function getUnit() {
    if (type === 'Glucosa') return data?.unit || ''
    if (type === 'Alimentación') return 'cal'
    if (type === 'Actividad') return 'min'
    if (type === 'Medicación' || type === 'MedicaciÃ³n') return 'dosis'
    return ''
  }

  function getMainTitle() {
    if (type === 'Glucosa') return data?.moment || 'Glucosa'
    if (type === 'Alimentación') return data?.mealType || 'Alimentación'
    if (type === 'Actividad') return data?.activityType || 'Actividad'
    if (type === 'Medicación' || type === 'MedicaciÃ³n') return data?.medType || 'Medicación'
    return type || ''
  }

  const measurement = getMeasurement()
  const unit = getUnit()
  const mainTitle = getMainTitle()

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
            <Box sx={{ textAlign: 'right', mr: 1 }}>
              <Typography variant="h6">{measurement}</Typography>
              <Typography variant="caption">{unit}</Typography>
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
