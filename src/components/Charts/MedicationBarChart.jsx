import React, { useContext, useEffect, useState } from 'react'
import { Box, Card, CardHeader, CardContent, ToggleButton, ToggleButtonGroup, Typography, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { AuthContext } from '../../App'
import { getUserRecords, getUserProfile } from '../../firebaseClient'
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

export default function MedicationBarChart({ defaultRange }) {
    const { user } = useContext(AuthContext)
    const [range, setRange] = useState(() => defaultRange || 'week')
    // Sync with prop updates (only when defaultRange prop changes)
    useEffect(() => {
        if (defaultRange) setRange(defaultRange)
    }, [defaultRange])
    const [loading, setLoading] = useState(false)
    const [seriesData, setSeriesData] = useState(null)
    const [hasRecs, setHasRecs] = useState(false)

    useEffect(() => {
        let mounted = true
        ;(async () => {
            if (!user?.email) return
            setLoading(true)
            setHasRecs(false)
            try {
                // try to get user meds list to order series (fallback: collect types from records)
                const profile = await getUserProfile(user.email)
                const medsList = (profile && profile.medicamentos) || []

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

                // Only consider records of type 'Medicación' as valid for this chart
                setHasRecs(Array.isArray(recs) && recs.some(r => r.type === 'Medicación'))

                // Collect medication types seen in records and merge with profile meds (profile order first)
                const typesSeen = new Set(medsList)
                recs.forEach(r => { if (r.type === 'Medicación' && r.data && r.data.medType) typesSeen.add(r.data.medType) })
                const medTypes = Array.from(typesSeen)
                if (medTypes.length === 0) medTypes.push('Medicamento')

                const seriesMap = {}
                medTypes.forEach(mt => { seriesMap[mt] = new Array(dayKeys.length).fill(0) })
                const dayIndex = {}
                dayKeys.forEach((k, i) => { dayIndex[k] = i })

                recs.forEach(r => {
                    if (!r.type || r.type !== 'Medicación') return
                    const key = formatTsToDateKey(r.ts)
                    if (!key) return
                    const idx = dayIndex[key]
                    if (idx === undefined) return
                    const mt = r.data?.medType || 'Medicamento'
                    const medKey = medTypes.includes(mt) ? mt : medTypes[0]
                    // count occurrences (or sum numeric dose if numeric) - try to sum dose when numeric
                    const doseRaw = r.data?.dose
                    let add = 1
                    if (doseRaw !== null && doseRaw !== undefined && doseRaw !== '') {
                        const n = Number(doseRaw)
                        if (!isNaN(n)) add = n
                    }
                    seriesMap[medKey][idx] = (seriesMap[medKey][idx] || 0) + add
                })

                const xAxis = dayKeys.map(k => formatKeyToLabel(k))
                const arrays = medTypes.map(mt => seriesMap[mt])

                if (mounted) setSeriesData({ xAxis, arrays, medTypes })
            } catch (e) {
                console.error('Error loading medication records', e)
            } finally {
                if (mounted) setLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [user, range])

    function handleRangeChange(_, v) { if (!v) return; setRange(v) }

    const theme = useTheme()
    const baseColors = [theme.palette.primary.main, theme.palette.info.main || '#2196f3', theme.palette.success.main || '#4caf50', theme.palette.warning.main || '#ffb300', theme.palette.error.main || '#f44336']

    return (
        <Card elevation={3} sx={{ mb: 2 }}>
            <CardHeader
                title="Medicación"
                subheader={`Dosis por día`}
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
                    !hasRecs ? (
                        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                            <Typography>No se encontraron registros de medicación en este intervalo.</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%', height: 360 }}>
                            <BarChart
                                height={360}
                                series={seriesData.medTypes.map((mt, i) => ({ label: mt, data: seriesData.arrays[i], stack: 'total' }))}
                                xAxis={[{ data: seriesData.xAxis, scaleType: 'band', label: 'Fecha' }]}
                                yAxis={[{ label: 'Dosis / Conteo', min: 0 }]}
                                colors={baseColors}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                    )
                )}
            </CardContent>
        </Card>
    )
}
