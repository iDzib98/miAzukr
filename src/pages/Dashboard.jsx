import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Fab } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import GlucoseScatter from '../components/charts/GlucoseScatter.jsx'
import BPChart from '../components/charts/BPChart.jsx'
import ErrorBoundary from '../components/ErrorBoundary'
import FoodBarChart from '../components/charts/FoodBarChart.jsx'
import ActivityBarChart from '../components/charts/ActivityBarChart.jsx'
import MedicationBarChart from '../components/charts/MedicationBarChart.jsx'
import { AuthContext } from '../App'

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [dashboardConfig, setDashboardConfig] = useState({
    order: ['Glucosa', 'Presión arterial', 'Alimentación', 'Actividad', 'Medicación'],
    visible: { 'Glucosa': true, 'Presión arterial': true, 'Alimentación': true, 'Actividad': true, 'Medicación': true },
    defaultRange: 'week'
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user?.email) return
      try {
        const mod = await import('../firebaseClient.js')
        const p = await mod.getUserProfile(user.email)
        const d = (p && p.dashboard) || {}
        const defaultOrder = ['Glucosa', 'Presión arterial', 'Alimentación', 'Actividad', 'Medicación']
        const order = Array.isArray(d.order) && d.order.length ? d.order : defaultOrder
        const visibleFromProfile = d.visible || {}
        const visible = {}
        defaultOrder.forEach(k => { visible[k] = visibleFromProfile[k] !== undefined ? Boolean(visibleFromProfile[k]) : true })
        const defaultRange = d.defaultRange || 'week'
        if (mounted) setDashboardConfig({ order, visible, defaultRange })
          console.log('Dashboard config loaded' , { order, visible, defaultRange })
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [user])

  const { order, visible, defaultRange } = dashboardConfig || {}

  const componentFor = (key) => {
    switch (key) {
      case 'Glucosa': return <GlucoseScatter defaultRange={defaultRange} />
      case 'Presión arterial': return <BPChart defaultRange={defaultRange} />
      case 'Alimentación': return <FoodBarChart defaultRange={defaultRange} />
      case 'Actividad': return <ActivityBarChart defaultRange={defaultRange} />
      case 'Medicación': return <MedicationBarChart defaultRange={defaultRange} />
      default: return null
    }
  }

  return (
    <ErrorBoundary>
      <Paper elevation={0} sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5">Dashboard</Typography>
          <Typography sx={{ mb: 2 }}>Resumen rápido de tus mediciones.</Typography>

          {order && order.map(k => (
            visible && visible[k] ? (
              <Box key={k} sx={{ mb: 2 }}>{componentFor(k)}</Box>
            ) : null
          ))}

          <Fab variant="extended" color="primary" sx={{ position: 'fixed', right: 16, bottom: 'calc(var(--bottom-offset) + 16px)' }} onClick={() => navigate('/registros', { state: { openForm: true } })}>
            <AddIcon sx={{ mr: 1 }} /> Añadir registro
          </Fab>

        </Box>
      </Paper>
    </ErrorBoundary>
  )
}
