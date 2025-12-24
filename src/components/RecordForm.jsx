import React, { useState, useEffect } from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	MenuItem,
	InputLabel,
	FormControl,
	Checkbox,
	ListItemText,
	OutlinedInput,
	Stack,
	Select,
	ToggleButton,
	ToggleButtonGroup,
	useTheme,
	useMediaQuery,
	Tooltip,
	Typography,
  InputAdornment
} from '@mui/material'
import OpacityIcon from '@mui/icons-material/Opacity'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import MedicationIcon from '@mui/icons-material/Medication'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'

const glucoseMoments = ['En ayuno','Antes de comer','Después de comer','Antes de dormir']
const glucoseSymptoms = ['Mareo','Cansancio','Visión borrosa']
const mealTypes = ['Desayuno','Almuerzo','Cena','Snack','Colación']
const activityTypes = ['Caminar','Correr','Gimnasio','Yoga']
const intensityLevels = ['Ligera','Moderada','Intensa']
const bpUnits = ['mmHg']

export default function RecordForm({ open, onClose, onSave, userProfile, initialRecord = null }) {
	function toLocalInputValue(d) {
		const y = d.getFullYear()
		const mo = String(d.getMonth() + 1).padStart(2, '0')
		const da = String(d.getDate()).padStart(2, '0')
		const hh = String(d.getHours()).padStart(2, '0')
		const mm = String(d.getMinutes()).padStart(2, '0')
		return `${y}-${mo}-${da}T${hh}:${mm}`
	}
	const nowLocal = toLocalInputValue(new Date())
	const [type, setType] = useState('Glucosa')
	const theme = useTheme()
	const isLarge = useMediaQuery(theme.breakpoints.up('sm'))
	const [datetime, setDatetime] = useState(nowLocal)
	const [notes, setNotes] = useState('')

	// glucose specific
	const [glucoseLevel, setGlucoseLevel] = useState('')
	const [glucoseUnit, setGlucoseUnit] = useState((userProfile && userProfile.unidadGlucosa) || 'mg/dL')
	const [glucoseMoment, setGlucoseMoment] = useState(glucoseMoments[0])
	const [glucoseSymptomsSel, setGlucoseSymptomsSel] = useState([])

	// presión arterial - momento y síntomas (reusar arrays de glucosa)
	const [bpMoment, setBpMoment] = useState(glucoseMoments[0])
	const [bpSymptomsSel, setBpSymptomsSel] = useState([])

	// comida
	const [mealType, setMealType] = useState(mealTypes[0])
	const [mealDesc, setMealDesc] = useState('')
	const [mealCarbs, setMealCarbs] = useState('')

	// actividad
	const [activityType, setActivityType] = useState(activityTypes[0])
	const [activityDuration, setActivityDuration] = useState('')
	const [activityIntensity, setActivityIntensity] = useState(intensityLevels[0])

	// medicacion
	const meds = (userProfile && userProfile.medicamentos) || []
	const [medType, setMedType] = useState(meds.length ? meds[0] : '')
	const [medDose, setMedDose] = useState('')

	// presión arterial
	const [bpSystolic, setBpSystolic] = useState('')
	const [bpDiastolic, setBpDiastolic] = useState('')

	useEffect(() => {
		if (open) {
			if (initialRecord) {
				// populate fields from initialRecord
				const rec = initialRecord
				const ts = rec.ts && rec.ts.toDate ? rec.ts.toDate() : (rec.ts instanceof Date ? rec.ts : new Date(rec.ts))
				setType(rec.type || 'Glucosa')
				setDatetime(toLocalInputValue(ts || new Date()))
				setNotes(rec.notes || '')
				setGlucoseLevel(rec.data?.level ?? '')
				setGlucoseUnit(rec.data?.unit || ((userProfile && userProfile.unidadGlucosa) || 'mg/dL'))
				setGlucoseMoment(rec.data?.moment || glucoseMoments[0])
				setGlucoseSymptomsSel(rec.data?.symptoms ? (String(rec.data.symptoms).split(',').map(s => s.trim()).filter(Boolean)) : [])
				setBpMoment(rec.data?.moment || glucoseMoments[0])
				setBpSymptomsSel(rec.data?.symptoms ? (String(rec.data.symptoms).split(',').map(s => s.trim()).filter(Boolean)) : [])
				setMealType(rec.data?.mealType || mealTypes[0])
				setMealDesc(rec.data?.description || '')
				setMealCarbs(rec.data?.carbs ?? '')
				setActivityType(rec.data?.activityType || activityTypes[0])
				setActivityDuration(rec.data?.durationMin ?? '')
				setActivityIntensity(rec.data?.intensity || intensityLevels[0])
				setMedType(rec.data?.medType || (meds.length ? meds[0] : ''))
				setMedDose(rec.data?.dose ?? '')
				setBpSystolic(rec.data?.systolic ?? '')
				setBpDiastolic(rec.data?.diastolic ?? '')
			} else {
				setType('Glucosa')
				setDatetime(nowLocal)
				setNotes('')
				setGlucoseLevel('')
				setGlucoseUnit((userProfile && userProfile.unidadGlucosa) || 'mg/dL')
				setGlucoseMoment(glucoseMoments[0])
				setGlucoseSymptomsSel([])
				setBpMoment(glucoseMoments[0])
				setBpSymptomsSel([])
				setMealType(mealTypes[0])
				setMealDesc('')
				setMealCarbs('')
				setActivityType(activityTypes[0])
				setActivityDuration('')
				setActivityIntensity(intensityLevels[0])
				setMedType(meds.length ? meds[0] : '')
				setMedDose('')
				setBpSystolic('')
				setBpDiastolic('')
			}
		}
	}, [open, initialRecord])

	function handleSave() {
		// parse datetime-local value as local time (avoid Date(..) ambiguous parsing)
		// expected format: YYYY-MM-DDTHH:mm
		let tsDate = new Date()
		try {
			const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})/.exec(datetime)
			if (m) {
				const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]), hh = Number(m[4]), mm = Number(m[5])
				tsDate = new Date(y, mo, d, hh, mm, 0, 0)
			} else {
				tsDate = new Date(datetime)
			}
		} catch (e) {
			tsDate = new Date(datetime)
		}
		const base = { ts: tsDate, type, notes }
		let payload = { ...base }
		// include id when editing
		if (initialRecord && initialRecord.id) payload.id = initialRecord.id
		if (type === 'Glucosa') {
			payload.data = {
				level: glucoseLevel === '' ? null : Number(glucoseLevel),
				unit: glucoseUnit,
				moment: glucoseMoment,
				symptoms: glucoseSymptomsSel.join(',')
			}
		} else if (type === 'Alimentación') {
			payload.data = { mealType, description: mealDesc, carbs: mealCarbs === '' ? null : Number(mealCarbs) }
		} else if (type === 'Actividad') {
			payload.data = { activityType, durationMin: activityDuration === '' ? null : Number(activityDuration), intensity: activityIntensity }
		} else if (type === 'Medicación') {
			payload.data = { medType, dose: medDose }
		} else if (type === 'Presión arterial') {
			payload.data = { systolic: bpSystolic === '' ? null : Number(bpSystolic), diastolic: bpDiastolic === '' ? null : Number(bpDiastolic), moment: bpMoment, symptoms: bpSymptomsSel.join(',') }
		}
		onSave(payload)
	}

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{initialRecord ? 'Editar registro' : 'Añadir registro'}</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<TextField label="Fecha y hora" type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} />

					<FormControl>
						<InputLabel sx={{ display: 'none' }}>Tipo de registro</InputLabel>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo de registro</Typography>
						{/* Responsive ToggleButtonGroup: only icons on small screens, icon+text on larger (only selected) */}
						<ToggleButtonGroup
							value={type}
							exclusive
							onChange={(e, val) => { if (val) setType(val) }}
							aria-label="Tipo de registro"
							fullWidth
							size="small"
						>
							<ToggleButton value="Glucosa" aria-label="Glucosa">
								<Tooltip title="Medición de glucosa">
									<span><OpacityIcon /></span>
								</Tooltip>
								{isLarge && type === 'Glucosa' && <span style={{ marginLeft: 8 }}>Glucosa</span>}
							</ToggleButton>
							<ToggleButton value="Presión arterial" aria-label="Presión arterial">
								<Tooltip title="Presión arterial">
									<span><MonitorHeartIcon /></span>
								</Tooltip>
								{isLarge && type === 'Presión arterial' && <span style={{ marginLeft: 8 }}>Presión</span>}
							</ToggleButton>
							<ToggleButton value="Alimentación" aria-label="Alimentación">
								<Tooltip title="Alimentación">
									<span><RestaurantIcon /></span>
								</Tooltip>
								{isLarge && type === 'Alimentación' && <span style={{ marginLeft: 8 }}>Alimentación</span>}
							</ToggleButton>
							<ToggleButton value="Actividad" aria-label="Actividad">
								<Tooltip title="Actividad física">
									<span><DirectionsRunIcon /></span>
								</Tooltip>
								{isLarge && type === 'Actividad' && <span style={{ marginLeft: 8 }}>Actividad</span>}
							</ToggleButton>
							<ToggleButton value="Medicación" aria-label="Medicación">
								<Tooltip title="Medicación">
									<span><MedicationIcon /></span>
								</Tooltip>
								{isLarge && type === 'Medicación' && <span style={{ marginLeft: 8 }}>Medicación</span>}
							</ToggleButton>
						</ToggleButtonGroup>

						{/* On small screens, show selected type text below the buttons for clarity */}
						{!isLarge && (
							<Typography variant="body2" color="text.primary" sx={{ mt: 0.5, textAlign: 'center' }}>{
								type === 'Glucosa' ? 'Medición de glucosa'
								: type === 'Presión arterial' ? 'Presión arterial'
								: type === 'Alimentación' ? 'Alimentación'
								: type === 'Actividad' ? 'Actividad física'
								: type === 'Medicación' ? 'Medicación' : type
							}</Typography>
						)}
					</FormControl>

					{type === 'Glucosa' && (
						<>
							<FormControl>
								<InputLabel>Momento</InputLabel>
								<Select value={glucoseMoment} label="Momento" onChange={e => setGlucoseMoment(e.target.value)}>
									{glucoseMoments.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
								</Select>
							</FormControl>

							<Stack direction="row" spacing={1}>
								<TextField label="Nivel de glucosa" type="number" value={glucoseLevel} onChange={e => setGlucoseLevel(e.target.value)} sx={{ flex: 1 }} />
								<FormControl sx={{ width: 140 }}>
									<InputLabel>Unidad</InputLabel>
									<Select value={glucoseUnit} label="Unidad" onChange={e => setGlucoseUnit(e.target.value)}>
										<MenuItem value="mg/dL">mg/dL</MenuItem>
										<MenuItem value="mmol/L">mmol/L</MenuItem>
									</Select>
								</FormControl>
							</Stack>


							<FormControl>
								<InputLabel>Síntomas</InputLabel>
								<Select multiple value={glucoseSymptomsSel} onChange={e => setGlucoseSymptomsSel(e.target.value)} input={<OutlinedInput label="Síntomas" />} renderValue={selected => selected.join(', ')}>
									{glucoseSymptoms.map(s => (
										<MenuItem key={s} value={s}>
											<Checkbox checked={glucoseSymptomsSel.indexOf(s) > -1} />
											<ListItemText primary={s} />
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</>
					)}

					{type === 'Alimentación' && (
						<>
							<FormControl>
								<InputLabel>Tipo de comida</InputLabel>
								<Select value={mealType} label="Tipo de comida" onChange={e => setMealType(e.target.value)}>
									{mealTypes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
								</Select>
							</FormControl>
							<TextField label="Carbohidratos (aprox)" type="number" value={mealCarbs} onChange={e => setMealCarbs(e.target.value)} />
							<TextField label="Descripción" value={mealDesc} onChange={e => setMealDesc(e.target.value)} />
						</>
					)}

					{type === 'Actividad' && (
						<>
							<FormControl>
								<InputLabel>Tipo de actividad</InputLabel>
								<Select value={activityType} label="Tipo de actividad" onChange={e => setActivityType(e.target.value)}>
									{activityTypes.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
								</Select>
							</FormControl>
							<TextField label="Duración (min)" type="number" value={activityDuration} onChange={e => setActivityDuration(e.target.value)} />
							<FormControl>
								<InputLabel>Intensidad</InputLabel>
								<Select value={activityIntensity} label="Intensidad" onChange={e => setActivityIntensity(e.target.value)}>
									{intensityLevels.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
								</Select>
							</FormControl>
						</>
					)}

					{type === 'Medicación' && (
						<>
							<FormControl>
								<InputLabel>Medicamento</InputLabel>
								<Select value={medType} label="Medicamento" onChange={e => setMedType(e.target.value)}>
									{meds.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
								</Select>
							</FormControl>
							<TextField label="Dosis" value={medDose} onChange={e => setMedDose(e.target.value)} />
						</>
					)}

					{type === 'Presión arterial' && (
						<>

							<FormControl>
								<InputLabel>Momento</InputLabel>
								<Select value={bpMoment} label="Momento" onChange={e => setBpMoment(e.target.value)}>
									{glucoseMoments.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
								</Select>
							</FormControl>

							<Stack direction="row" spacing={1}>
								<TextField label="Sistólica (mmHg)" type="number" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)} sx={{ flex: 1 }} />
								<TextField label="Diastólica (mmHg)" type="number" value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)} sx={{ flex: 1 }} />
							</Stack>

							<FormControl>
								<InputLabel>Síntomas</InputLabel>
								<Select multiple value={bpSymptomsSel} onChange={e => setBpSymptomsSel(e.target.value)} input={<OutlinedInput label="Síntomas" />} renderValue={selected => selected.join(', ')}>
									{glucoseSymptoms.map(s => (
										<MenuItem key={s} value={s}>
											<Checkbox checked={bpSymptomsSel.indexOf(s) > -1} />
											<ListItemText primary={s} />
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</>
					)}

					<TextField label="Notas" multiline minRows={2} value={notes} onChange={e => setNotes(e.target.value)} />
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button onClick={handleSave} variant="contained">Guardar</Button>
			</DialogActions>
		</Dialog>
	)
}

