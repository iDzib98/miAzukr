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
    // key YYYY-MM-DD
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatKeyToLabel(key) {
    // key: YYYY-MM-DD -> label DD/MM/YYYY
    if (!key) return ''
    const [y, m, d] = key.split('-')
    return `${d}/${m}/${y}`
}

export default function FoodBarChart({ defaultRange }) {
    const { user } = useContext(AuthContext)
    const [range, setRange] = useState(() => defaultRange || 'week')
    // Sync with prop updates (only when defaultRange prop changes)
    useEffect(() => {
        if (defaultRange) setRange(defaultRange)
    }, [defaultRange])
    const [loading, setLoading] = useState(false)
    const [seriesData, setSeriesData] = useState(null)

    const mealTypes = ['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Colación']

    useEffect(() => {
        let mounted = true
            ; (async () => {
                if (!user?.email) return
                setLoading(true)
                try {
                    const now = new Date()
                    let from = new Date()
                    if (range === 'day') from.setTime(now.getTime() - 24 * 60 * 60 * 1000)
                    else if (range === 'week') from.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    else from.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                    const to = now

                    // normalize day start/end
                    const startDay = new Date(from); startDay.setHours(0, 0, 0, 0)
                    const endDay = new Date(to); endDay.setHours(0, 0, 0, 0)

                    // build list of day keys between startDay and endDay inclusive
                    const dayKeys = []
                    for (let d = new Date(startDay); d.getTime() <= endDay.getTime(); d.setDate(d.getDate() + 1)) {
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        dayKeys.push(key)
                    }

                    const recs = await getUserRecords(user.email, startDay, new Date(endDay.getTime() + 24 * 60 * 60 * 1000 - 1))

                    // Create series first: an array of zeros for each meal type, length = number of days
                    const seriesMap = {}
                    dayKeys.forEach((k, idx) => { })
                    mealTypes.forEach(mt => {
                        seriesMap[mt] = new Array(dayKeys.length).fill(0)
                    })

                    // map day key to index for quick lookup
                    const dayIndex = {}
                    dayKeys.forEach((k, i) => { dayIndex[k] = i })

                    // Sum carbs into series arrays per-day per-meal
                    recs.forEach(r => {
                        if (!r.type || r.type !== 'Alimentación') return
                        const key = formatTsToDateKey(r.ts)
                        if (!key) return
                        const idx = dayIndex[key]
                        if (idx === undefined) return // out of range
                        const carbs = r.data?.carbs ? Number(r.data.carbs) : 0
                        const meal = r.data?.mealType || 'Snack'
                        const mt = mealTypes.includes(meal) ? meal : 'Snack'
                        if (isNaN(carbs)) return
                        seriesMap[mt][idx] = (seriesMap[mt][idx] || 0) + carbs
                    })

                    // produce arrays from seriesMap
                    const xAxis = dayKeys.map(k => formatKeyToLabel(k))
                    const arrays = mealTypes.map(mt => seriesMap[mt])

                    if (mounted) {
                        // Debug logs: print xAxis (days) and each series array before setting state
                        try {
                            console.log('FoodBarChart - days (xAxis):', xAxis)
                            mealTypes.forEach((mt, i) => {
                                console.log(`FoodBarChart - series ${mt}:`, arrays[i])
                            })
                        } catch (e) {
                            // ignore console errors
                        }
                        setSeriesData({ xAxis, arrays })
                        console.log('FoodBarChart - seriesData set', { xAxis, arrays })
                    }
                } catch (e) {
                    console.error('Error loading food records', e)
                } finally {
                    if (mounted) setLoading(false)
                }
            })()
        return () => { mounted = false }
    }, [user, range])

    function handleRangeChange(_, v) { if (!v) return; setRange(v) }

    const theme = useTheme()
    const colors = [theme.palette.primary.main, theme.palette.info.main || '#2196f3', theme.palette.success.main || '#4caf50', theme.palette.warning.main || '#ffb300', theme.palette.error.main || '#f44336']

    return (
        <Card elevation={3} sx={{ mb: 2 }}>
            <CardHeader
                title="Alimentación (carbohidratos por día)"
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
                            <Typography>No se encontraron registros de alimentación en este intervalo.</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%', height: 360 }}>
                            <BarChart
                                height={360}
                                series={mealTypes.map((mt, i) => ({ label: mt, data: seriesData.arrays[i], stack: 'total' }))}
                                xAxis={[
                                    {
                                        data: seriesData.xAxis,
                                        scaleType: 'band',
                                        label: 'Fecha', // X-Axis Title
                                    },
                                ]}
                                yAxis={[{ label: 'g de carbohidratos', min: 0 }]}
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
