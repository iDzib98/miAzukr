import React from 'react'
import { Box, Typography, Paper } from '@mui/material'

export default function Dashboard() {
  return (
    <Paper sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Typography>Vista de ejemplo para el Dashboard.</Typography>
      </Box>
    </Paper>
  )
}
