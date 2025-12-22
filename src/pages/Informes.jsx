import React from 'react'
import { Box, Typography, Paper } from '@mui/material'

export default function Informes() {
  return (
    <Paper elevation={0} sx={{ m: 0, borderRadius: 0, minHeight: 'calc(100vh - var(--top-offset) - var(--bottom-offset))' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Informes</Typography>
        <Typography>Vista de ejemplo para Informes.</Typography>
      </Box>
    </Paper>
  )
}
