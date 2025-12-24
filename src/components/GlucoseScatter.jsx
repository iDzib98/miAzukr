import React, { useContext, useEffect, useState } from 'react'
import { Box, Card, CardHeader, CardContent, ToggleButton, ToggleButtonGroup, Typography, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { AuthContext } from '../App'
import { getUserProfile, getUserRecords } from '../firebaseClient'
import defaultProfile from '../defaultProfile'
import { ScatterChart } from '@mui/x-charts/ScatterChart'

function formatTsToMs(ts) {
    if (!ts) return null
    if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().getTime()
    if (ts instanceof Date) return ts.getTime()
    const d = new Date(ts)
    return isNaN(d.getTime()) ? null : d.getTime()
}

export default function GlucoseScatter({ defaultRange }) {
    const { user } = useContext(AuthContext)
    const [range, setRange] = useState(() => defaultRange || 'week') // 'day'|'week'|'month'
    // Keep range in sync when parent updates defaultRange (only when prop changes)
    useEffect(() => {
        if (defaultRange) setRange(defaultRange)
    }, [defaultRange])
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState(null)
    const [points, setPoints] = useState({ green: [], yellow: [], red: [] })
    const [xDomain, setXDomain] = useState([null, null])
    const [stats, setStats] = useState({ mean: null, std: null, countHigh: 0, countLow: 0, boloCount: 0 })

    useEffect(() => {
        let mounted = true
            ; (async () => {
                if (!user?.email) return
                const p = await getUserProfile(user.email)
                if (mounted) setProfile(p || defaultProfile)
            })()
        return () => { mounted = false }
    }, [user])

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

                    // compute closed x-axis domain:
                    // - for 'week' and 'month' use full days (start of first day .. end of last day)
                    // - for 'day' use closed hours (round down first point to hour, round up end to end of hour)
                    try {
                        let domainStart = new Date(from)
                        let domainEnd = new Date(to)
                        if (range === 'day') {
                            // round start down to nearest hour
                            domainStart.setMinutes(0, 0, 0)
                            // round end up to next hour start then subtract 1ms to be inclusive
                            const endHour = new Date(domainEnd)
                            endHour.setMinutes(0, 0, 0)
                            if (endHour.getTime() <= domainEnd.getTime()) endHour.setHours(endHour.getHours() + 1)
                            domainEnd = new Date(endHour.getTime() - 1)
                        } else {
                            // round to full days
                            domainStart.setHours(0, 0, 0, 0)
                            domainEnd.setHours(23, 59, 59, 999)
                        }
                        setXDomain([domainStart.getTime(), domainEnd.getTime()])
                    } catch (e) {
                        // ignore domain compute errors
                        setXDomain([null, null])
                    }
                    const recs = await getUserRecords(user.email, from, to)
                    // filter and map glucose records
                    const p = profile || defaultProfile
                    // conversion helpers
                    function mgdlToMmoll(v) { return Number((v / 18).toFixed(1)) }
                    function mmollToMgdl(v) { return Math.round(v * 18) }

                    const green = []
                    const yellow = []
                    const red = []
                    const allVals = []
                    let boloCount = 0

                    recs.forEach(r => {
                        if (!r.type || r.type !== 'Glucosa') return
                        const raw = r.data?.level
                        if (raw === null || raw === undefined || raw === '') return
                        const storedUnit = (r.data && r.data.unit) || p.unidadGlucosa || 'mg/dL'
                        let num = Number(raw)
                        if (isNaN(num)) return
                        // convert to preferred unit
                        let valInPreferred = num
                        const preferred = p.unidadGlucosa || 'mg/dL'
                        if (storedUnit !== preferred) {
                            if (storedUnit === 'mg/dL' && preferred === 'mmol/L') valInPreferred = mgdlToMmoll(num)
                            else if (storedUnit === 'mmol/L' && preferred === 'mg/dL') valInPreferred = mmollToMgdl(num)
                        }

                        const ms = formatTsToMs(r.ts)
                        if (!ms) return

                        // thresholds (user expected to have values in preferred unit)
                        const min = Number(p.intervaloIdealMin)
                        const max = Number(p.intervaloIdealMax)
                        const muyAlto = Number(p.muyAlto)
                        const muyBajo = Number(p.muyBajo)
                        const valNum = Number(valInPreferred)

                        const point = { x: ms, y: valNum, original: r }

                        if ((!isNaN(muyAlto) && valNum >= muyAlto) || (!isNaN(muyBajo) && valNum <= muyBajo)) {
                            red.push(point)
                        } else if (!isNaN(min) && !isNaN(max) && valNum >= min && valNum <= max) {
                            green.push(point)
                        } else {
                            yellow.push(point)
                        }
                        allVals.push(valNum)
                    })

                    // count bolos (medicación records with medType containing 'bolo')
                    try {
                        recs.forEach(r => {
                            if (r.type === 'Medicación' && r.data && r.data.medType) {
                                const mt = String(r.data.medType).toLowerCase()
                                if (mt.indexOf('bolo') > -1 || mt.indexOf('bolus') > -1) boloCount++
                            }
                        })
                    } catch (e) {
                        // ignore
                    }

                    // compute mean and std deviation (population)
                    let mean = null, std = null
                    if (allVals.length > 0) {
                        const s = allVals.reduce((a, b) => a + b, 0)
                        mean = s / allVals.length
                        const variance = allVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allVals.length
                        std = Math.sqrt(variance)
                    }

                    // counts: above/below ideal (use intervaloIdealMin/Max if present)
                    let countHigh = 0, countLow = 0
                    if (allVals.length > 0) {
                        const idealMin = Number(p.intervaloIdealMin)
                        const idealMax = Number(p.intervaloIdealMax)
                        allVals.forEach(v => {
                            if (!isNaN(idealMax) && v > idealMax) countHigh++
                            if (!isNaN(idealMin) && v < idealMin) countLow++
                        })
                    }

                    if (mounted) {
                        setPoints({ green, yellow, red })
                        setStats({ mean, std, countHigh, countLow, boloCount })
                    }
                } catch (e) {
                    console.error('Error loading glucose points', e)
                } finally {
                    if (mounted) setLoading(false)
                }
            })()
        return () => { mounted = false }
    }, [user, range, profile])

    function handleRangeChange(_, v) {
        if (!v) return
        setRange(v)
    }

    function tooltipFormatter(value, name, props) {
        const unit = (profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa
        console.log('Tooltip formatter', value, name, props)
        if (name === 'Fecha') {
            const d = new Date(value)
            return [d.toLocaleString("es-MX", {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }), name]
        } else if (name === 'Glucosa') {
            return [`${value} ${unit}`, name]
        }
    }

    function tooltipLabelFormatter(label) {
        const d = new Date(label)
        return d.toLocaleString()
    }

    // Severity helpers for coloring the stat circles
    function getMeanSeverity(meanVal, p) {
        if (meanVal === null || isNaN(meanVal)) return 'grey'
        const min = Number(p.intervaloIdealMin)
        const max = Number(p.intervaloIdealMax)
        const muyAlto = Number(p.muyAlto)
        const muyBajo = Number(p.muyBajo)
        if (!isNaN(muyAlto) && meanVal >= muyAlto) return 'red'
        if (!isNaN(muyBajo) && meanVal <= muyBajo) return 'red'
        if (!isNaN(min) && !isNaN(max) && meanVal >= min && meanVal <= max) return 'green'
        return 'yellow'
    }

    function getStdSeverity(stdVal, meanVal, p) {
        if (stdVal === null || isNaN(stdVal)) return 'grey'
        const min = Number(p.intervaloIdealMin)
        const max = Number(p.intervaloIdealMax)
        let range = NaN
        if (!isNaN(min) && !isNaN(max)) range = max - min
        // fallback to mean-based heuristics
        if (isNaN(range) || range <= 0) range = meanVal ? meanVal : 100
        if (stdVal <= range * 0.25) return 'green'
        if (stdVal <= range * 0.5) return 'yellow'
        return 'red'
    }

    const theme = useTheme()
    const severityColors = {
        green: theme.palette?.success?.main || '#4caf50',
        yellow: theme.palette?.warning?.main || '#ffb300',
        red: theme.palette?.error?.main || '#f44336',
        grey: theme.palette?.action?.disabledBackground || theme.palette?.grey?.[300] || '#e0e0e0'
    }
    const textColorFor = (sev) => {
        const bg = severityColors[sev] || theme.palette.background.paper
        try {
            return theme.palette.getContrastText(bg)
        } catch (e) {
            return sev === 'yellow' ? 'text.primary' : '#fff'
        }
    }

    return (
        <Card elevation={3} sx={{ mb: 2 }}>
            <CardHeader
                title="Mediciones de glucosa"
                subheader={`${(profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa}`}
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
                    (points.green.length + points.yellow.length + points.red.length) === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                            <Typography>No se encontraron mediciones en este intervalo.</Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ width: '100%', height: 320 }}>
                                <ScatterChart
                                    height={320}
                                    // series: order matches colors array below
                                    series={[
                                        {
                                            id: 'ideal',
                                            label: 'Ideal',
                                            data: points.green.map((p, i) => ({ id: p.original?.id || `ideal-${i}`, x: p.x, y: p.y })),
                                            valueFormatter: ({ x, y }) => {
                                                const unit = (profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa
                                                return `${y} ${unit}`
                                            }
                                        },
                                        {
                                            id: 'warning',
                                            label: 'Advertencia',
                                            data: points.yellow.map((p, i) => ({ id: p.original?.id || `warn-${i}`, x: p.x, y: p.y })),
                                            valueFormatter: ({ x, y }) => {
                                                const unit = (profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa
                                                return `${y} ${unit}`
                                            }
                                        },
                                        {
                                            id: 'critical',
                                            label: 'Crítico',
                                            data: points.red.map((p, i) => ({ id: p.original?.id || `crit-${i}`, x: p.x, y: p.y })),
                                            valueFormatter: ({ x, y }) => {
                                                const unit = (profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa
                                                return `${y} ${unit}`
                                            }
                                        }
                                    ]}
                                    // set xAxis domain (time) and formatting
                                    xAxis={[{
                                        min: xDomain[0] || undefined,
                                        max: xDomain[1] || undefined,
                                        scaleType: 'time',
                                        valueFormatter: (v) => range === 'day' ? new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : new Date(v).toLocaleDateString('es-MX'),
                                    }]}
                                    yAxis={[{ label: (profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa }]}
                                    grid={{ vertical: true, horizontal: true }}
                                    colors={[severityColors.green, severityColors.yellow, severityColors.red]}
                                    tooltip={{ trigger: 'item' }}
                                    sx={{ width: '100%' }}
                                />
                            </Box>
                            {/* Stats as circular badges */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                                {/* compute unit */}
                                {(() => {
                                    const unit = (profile && profile.unidadGlucosa) || defaultProfile.unidadGlucosa
                                    const circleSize = 88
                                    const valOrDash = (v, isFloat) => v === null ? '—' : (isFloat ? Number(v).toFixed(1) : Math.round(v))

                                    // compute severities based on profile thresholds and points
                                    const p = profile || defaultProfile
                                    const meanSeverity = getMeanSeverity(stats.mean, p)
                                    const stdSeverity = getStdSeverity(stats.std, stats.mean, p)

                                    // Determine whether highs/lows contained critical entries
                                    const idealMin = Number(p.intervaloIdealMin)
                                    const idealMax = Number(p.intervaloIdealMax)
                                    const highCritical = points.red.some(pt => !isNaN(idealMax) && pt.y > idealMax)
                                    const lowCritical = points.red.some(pt => !isNaN(idealMin) && pt.y < idealMin)
                                    const highHasWarning = (stats.countHigh > 0) && !highCritical
                                    const lowHasWarning = (stats.countLow > 0) && !lowCritical

                                    const highSeverity = highCritical ? 'red' : (stats.countHigh === 0 ? 'green' : 'yellow')
                                    const lowSeverity = lowCritical ? 'red' : (stats.countLow === 0 ? 'green' : 'yellow')

                                    return (
                                        <>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                {/* Mean */}
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Box sx={{ width: circleSize, height: circleSize, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', bgcolor: severityColors[meanSeverity], color: textColorFor(meanSeverity), boxShadow: 1 }}>
                                                        <Typography variant="h6">{stats.mean === null ? '—' : ((profile && profile.unidadGlucosa) === 'mmol/L' ? Number(stats.mean).toFixed(1) : Math.round(stats.mean))}</Typography>
                                                        <Typography variant="caption" sx={{ mt: 0.5 }}>{unit}</Typography>
                                                    </Box>
                                                    <Typography variant="caption">Media</Typography>
                                                </Box>

                                                {/* Std */}
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Box sx={{ width: circleSize, height: circleSize, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', bgcolor: severityColors[stdSeverity], color: textColorFor(stdSeverity), boxShadow: 1 }}>
                                                        <Typography variant="h6">{stats.std === null ? '—' : "±" + ((profile && profile.unidadGlucosa) === 'mmol/L' ? Number(stats.std).toFixed(1) : Math.round(stats.std))}</Typography>
                                                        <Typography variant="caption" sx={{ mt: 0.5 }}>{unit}</Typography>
                                                    </Box>
                                                    <Typography variant="caption">Desviación</Typography>
                                                </Box>

                                                {/* High/Low combined (divided circle) */}
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Box sx={{ width: circleSize, height: circleSize, borderRadius: '50%', position: 'relative', boxShadow: 1, overflow: 'hidden' }}>
                                                        {/* top half = high, bottom half = low */}
                                                        <Box sx={{ position: 'absolute', inset: 0 }}>
                                                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '49%', backgroundColor: severityColors[highSeverity] }} />
                                                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '49%', backgroundColor: severityColors[lowSeverity] }} />
                                                        </Box>
                                                        {/* labels */}
                                                        <Typography variant="h6" sx={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', color: textColorFor(highSeverity) }}>{stats.countHigh ?? 0}</Typography>
                                                        <Typography variant="h6" sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: textColorFor(lowSeverity) }}>{stats.countLow ?? 0}</Typography>
                                                    </Box>
                                                    <Typography variant="caption">Altos / Bajos</Typography>
                                                </Box>

                                                {/* Bolo */}
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Box sx={{ width: circleSize, height: circleSize, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', bgcolor: 'background.paper', boxShadow: 1 }}>
                                                        <Typography variant="h6">{stats.boloCount ?? 0}</Typography>
                                                        <Typography variant="caption" sx={{ mt: 0.5 }}>U</Typography>
                                                    </Box>
                                                    <Typography variant="caption">Bolo</Typography>
                                                </Box>
                                            </Box>
                                        </>
                                    )
                                })()}
                            </Box>
                        </>
                    )
                )}
            </CardContent>
        </Card>
    )
}
