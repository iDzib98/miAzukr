import React, { useContext, useEffect, useState } from 'react'
import { Box, Card, CardHeader, CardContent, ToggleButton, ToggleButtonGroup, Typography, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { AuthContext } from '../App'
import { getUserProfile, getUserRecords } from '../firebaseClient'
import defaultProfile from '../defaultProfile'
import { LineChart } from '@mui/x-charts/LineChart'

function formatTsToMs(ts) {
    if (!ts) return null
    if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().getTime()
    if (ts instanceof Date) return ts.getTime()
    const d = new Date(ts)
    return isNaN(d.getTime()) ? null : d.getTime()
}

export default function BPChart({ defaultRange }) {
    const { user } = useContext(AuthContext)
    const [range, setRange] = useState(() => defaultRange || 'week')
    // Sync with prop updates (only when defaultRange prop changes)
    useEffect(() => {
        if (defaultRange) setRange(defaultRange)
    }, [defaultRange])
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState(null)
    const [series, setSeries] = useState({ systolic: [], diastolic: [] })
    const [xDomain, setXDomain] = useState([null, null])

    useEffect(() => {
        let mounted = true
        ;(async () => {
                if (!user?.email) return
                const p = await getUserProfile(user.email)
                if (mounted) {
                    const newP = p || defaultProfile
                    setProfile(prev => {
                        try {
                            if (JSON.stringify(prev) === JSON.stringify(newP)) return prev
                        } catch (e) {
                            // fallback: always set if stringify fails
                        }
                        return newP
                    })
                }
            })()
        return () => { mounted = false }
    }, [user])

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

                // compute domain similar to GlucoseScatter
                try {
                    let domainStart = new Date(from)
                    let domainEnd = new Date(to)
                    if (range === 'day') {
                        domainStart.setMinutes(0,0,0)
                        const endHour = new Date(domainEnd)
                        endHour.setMinutes(0,0,0)
                        if (endHour.getTime() <= domainEnd.getTime()) endHour.setHours(endHour.getHours() + 1)
                        domainEnd = new Date(endHour.getTime() - 1)
                    } else {
                        domainStart.setHours(0,0,0,0)
                        domainEnd.setHours(23,59,59,999)
                    }
                    setXDomain([domainStart.getTime(), domainEnd.getTime()])
                } catch (e) {
                    setXDomain([null, null])
                }

                const recs = await getUserRecords(user.email, from, to)
                const systolic = []
                const diastolic = []

                recs.forEach(r => {
                    if (!r.type || r.type !== 'Presión arterial') return
                    const ms = formatTsToMs(r.ts)
                    if (!ms) return
                    const sRaw = r.data?.systolic
                    const dRaw = r.data?.diastolic
                    const s = (sRaw === null || sRaw === undefined || sRaw === '') ? null : Number(sRaw)
                    const d = (dRaw === null || dRaw === undefined || dRaw === '') ? null : Number(dRaw)
                    if (s !== null && !isNaN(s)) systolic.push({ x: ms, y: s, original: r })
                    if (d !== null && !isNaN(d)) diastolic.push({ x: ms, y: d, original: r })
                })

                if (mounted) {
                    const newSeries = { systolic, diastolic }
                    setSeries(prev => {
                        try {
                            if (JSON.stringify(prev) === JSON.stringify(newSeries)) return prev
                        } catch (e) {
                            // ignore stringify errors
                        }
                        return newSeries
                    })
                }
            } catch (e) {
                console.error('Error loading BP records', e)
            } finally {
                if (mounted) setLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [user, range])

    function handleRangeChange(_, v) { if (!v) return; setRange(v) }

    const theme = useTheme()
    const systolicColor = theme.palette?.error?.main || '#f44336'
    const diastolicColor = theme.palette?.success?.main || '#4caf50'
    // Prepare x-axis categories (unique timestamps) and align series to those x values.
    const allX = [ ...(series.systolic || []).map(p => p.x), ...(series.diastolic || []).map(p => p.x) ]
    const uniqueX = Array.from(new Set(allX)).sort((a,b) => a - b)

    const systolicAligned = uniqueX.map(x => {
        const p = (series.systolic || []).find(pt => pt.x === x)
        return (p && typeof p.y === 'number') ? p.y : null
    })
    const diastolicAligned = uniqueX.map(x => {
        const p = (series.diastolic || []).find(pt => pt.x === x)
        return (p && typeof p.y === 'number') ? p.y : null
    })

    return (
        <Card elevation={3} sx={{ mb: 2 }}>
            <CardHeader
                title="Presión arterial"
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
                    (series.systolic.length + series.diastolic.length) === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                            <Typography>No se encontraron mediciones en este intervalo.</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%', height: 320 }}>
                            <LineChart
                                height={320}
                                series={[
                                    { id: 'systolic', label: 'Sistólica', data: systolicAligned },
                                    { id: 'diastolic', label: 'Diastólica', data: diastolicAligned }
                                ]}
                                xAxis={[{
                                    data: uniqueX.length ? uniqueX : undefined,
                                    scaleType: 'time',
                                    valueFormatter: (v) => range === 'day' ? new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : new Date(v).toLocaleDateString('es-MX')
                                }]}
                                yAxis={[{ label: 'mmHg' }]}
                                grid={{ vertical: true, horizontal: true }}
                                colors={[systolicColor, diastolicColor]}
                                tooltip={{ trigger: 'item' }}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                    )
                )}
            </CardContent>
        </Card>
    )
}
