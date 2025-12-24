import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import GlucoseScatter from '../components/GlucoseScatter'
import BPChart from '../components/BPChart'
import ErrorBoundary from '../components/ErrorBoundary'
import FoodBarChart from '../components/FoodBarChart'
import ActivityBarChart from '../components/ActivityBarChart'
import MedicationBarChart from '../components/MedicationBarChart'

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <Paper elevation={0} sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5">Dashboard</Typography>
          <Typography sx={{ mb: 2 }}>Resumen rápido de tus mediciones.</Typography>

          <GlucoseScatter />

          <BPChart />

          <FoodBarChart />

          <ActivityBarChart />

          <MedicationBarChart />

        </Box>
      </Paper>
    </ErrorBoundary>
  )
}
