import React, { useContext, useEffect, useState } from 'react'
import { Box, Card, CardHeader, CardContent, ToggleButton, ToggleButtonGroup, Typography, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { AuthContext } from '../App'
import { getUserRecords } from '../firebaseClient'
import { BarChart } from '@mui/x-charts/BarChart'

function formatTsToDateKey(ts) {
    if (!ts) return null
    let d
    if (ts.toDate && typeof ts.toDate === 'function') d = ts.toDate()
    else d = (ts instanceof Date) ? ts : new Date(ts)
    if (isNaN(d.getTime())) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatKeyToLabel(key) {
    if (!key) return ''
    const [y, m, d] = key.split('-')
    return `${d}/${m}/${y}`
}

export default function ActivityBarChart({ defaultRange }) {
    const { user } = useContext(AuthContext)
    const [range, setRange] = useState(() => defaultRange || 'week')
    // Sync with prop updates (only when defaultRange prop changes)
    useEffect(() => {
        if (defaultRange) setRange(defaultRange)
    }, [defaultRange])
    const [loading, setLoading] = useState(false)
    const [seriesData, setSeriesData] = useState(null)

    // default activity types (kept in sync with RecordForm)
    const activityTypes = ['Caminar', 'Correr', 'Gimnasio', 'Yoga']

    useEffect(() => {
        let mounted = true
        ;(async () => {
            if (!user?.email) return
            setLoading(true)
            try {
                const now = new Date()
                let from = new Date()
                if (range === 'day') from.setTime(now.getTime() - 24 * 60 * 60 * 1000)
                else if (range === 'week') from.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                else from.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                const to = now

                const startDay = new Date(from); startDay.setHours(0,0,0,0)
                const endDay = new Date(to); endDay.setHours(0,0,0,0)

                const dayKeys = []
                for (let d = new Date(startDay); d.getTime() <= endDay.getTime(); d.setDate(d.getDate() + 1)) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    dayKeys.push(key)
                }

                const recs = await getUserRecords(user.email, startDay, new Date(endDay.getTime() + 24 * 60 * 60 * 1000 - 1))

                const seriesMap = {}
                activityTypes.forEach(mt => { seriesMap[mt] = new Array(dayKeys.length).fill(0) })
                const dayIndex = {}
                dayKeys.forEach((k, i) => { dayIndex[k] = i })

                recs.forEach(r => {
                    if (!r.type || r.type !== 'Actividad') return
                    const key = formatTsToDateKey(r.ts)
                    if (!key) return
                    const idx = dayIndex[key]
                    if (idx === undefined) return
                    const dur = r.data?.durationMin ? Number(r.data.durationMin) : 0
                    const at = r.data?.activityType || 'Caminar'
                    const mt = activityTypes.includes(at) ? at : 'Caminar'
                    if (isNaN(dur)) return
                    seriesMap[mt][idx] = (seriesMap[mt][idx] || 0) + dur
                })

                const xAxis = dayKeys.map(k => formatKeyToLabel(k))
                const arrays = activityTypes.map(mt => seriesMap[mt])

                if (mounted) setSeriesData({ xAxis, arrays })
            } catch (e) {
                console.error('Error loading activity records', e)
            } finally {
                if (mounted) setLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [user, range])

    function handleRangeChange(_, v) { if (!v) return; setRange(v) }

    const theme = useTheme()
    const colors = [theme.palette.primary.main, theme.palette.info.main || '#2196f3', theme.palette.success.main || '#4caf50', theme.palette.warning.main || '#ffb300']

    return (
        <Card elevation={3} sx={{ mb: 2 }}>
            <CardHeader
                title="Actividad física (min por día)"
                subheader={`Último ${range}`}
                action={(
                    <ToggleButtonGroup size="small" value={range} exclusive onChange={handleRangeChange} aria-label="Rango">
                        <ToggleButton value="day">Día</ToggleButton>
                        <ToggleButton value="week">Semana</ToggleButton>
                        <ToggleButton value="month">Mes</ToggleButton>
                    </ToggleButtonGroup>
                )}
            />
            <CardContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                ) : (
                    !seriesData || seriesData.xAxis.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                            <Typography>No se encontraron registros de actividad en este intervalo.</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%', height: 360 }}>
                            <BarChart
                                height={360}
                                series={activityTypes.map((mt, i) => ({ label: mt, data: seriesData.arrays[i], stack: 'total' }))}
                                xAxis={[{ data: seriesData.xAxis, scaleType: 'band', label: 'Fecha' }]}
                                yAxis={[{ label: 'Minutos', min: 0 }]}
                                colors={colors}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                    )
                )}
            </CardContent>
        </Card>
    )
}
