import React, { useContext, useEffect, useState } from 'react'
import { Box, Typography, Paper } from '@mui/material'
import GlucoseScatter from '../components/GlucoseScatter'
import BPChart from '../components/BPChart'
import ErrorBoundary from '../components/ErrorBoundary'
import FoodBarChart from '../components/FoodBarChart'
import ActivityBarChart from '../components/ActivityBarChart'
import MedicationBarChart from '../components/MedicationBarChart'
import { AuthContext } from '../App'

export default function Dashboard() {
  const { user } = useContext(AuthContext)
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

        </Box>
      </Paper>
    </ErrorBoundary>
  )
}
