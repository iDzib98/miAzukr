import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

function formatDate(d) {
  try {
    if (!d) return ''
    // Firestore Timestamp has toDate()
    if (typeof d.toDate === 'function') {
      return d.toDate().toLocaleString()
    }
    // Sometimes stored as { seconds, nanoseconds }
    if (d.seconds && typeof d.seconds === 'number') {
      return new Date(d.seconds * 1000).toLocaleString()
    }
    // If it's a number (ms since epoch) or ISO string
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleString()
  } catch (e) {
    return String(d)
  }
}

function toDateObj(d) {
  if (!d) return null
  if (typeof d.toDate === 'function') return d.toDate()
  if (d.seconds && typeof d.seconds === 'number') return new Date(d.seconds * 1000)
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return dt
}

// Glucose unit helpers
function normalizeGlucoseUnit(u) {
  if (!u) return ''
  const s = String(u).toLowerCase()
  if (s.includes('mg')) return 'mg/dL'
  if (s.includes('mmol')) return 'mmol/L'
  return u
}

function convertGlucose(value, fromUnit, toUnit) {
  if (value === null || value === undefined || value === '') return { value: '', unit: toUnit }
  const factor = 18.0182
  const from = normalizeGlucoseUnit(fromUnit || '')
  const to = normalizeGlucoseUnit(toUnit || '')
  let num = Number(value)
  if (isNaN(num)) return { value: value, unit: to }
  if (from === to || !from || !to) return { value: num, unit: to || from }
  if (from === 'mg/dL' && to === 'mmol/L') {
    return { value: num / factor, unit: to }
  }
  if (from === 'mmol/L' && to === 'mg/dL') {
    return { value: num * factor, unit: to }
  }
  return { value: num, unit: to }
}

function formatGlucoseDisplay(val, unit) {
  if (val === null || val === undefined || val === '') return ''
  const u = normalizeGlucoseUnit(unit)
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (u === 'mmol/L') return Number(n).toFixed(1)
  // mg/dL show integer
  return Math.round(n).toString()
}

function formatDateFull(d) {
  const dt = toDateObj(d)
  if (!dt) return ''
  const s = dt.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatTime(d) {
  const dt = toDateObj(d)
  if (!dt) return ''
  return dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export async function generatePDFReport(userProfile = {}, records = [], { month, year } = {}) {
  const doc = new jsPDF()
  const title = `Reporte - ${month || ''}/${year || ''}`
  doc.setFontSize(14)
  // Title
  doc.setFont(undefined, 'bold')
  doc.text(title, 14, 20)

  doc.setFont(undefined, 'normal')
  doc.setFontSize(11)
  const profileLines = []
  if (userProfile.nombre) profileLines.push(`Nombre: ${userProfile.nombre}`)
  if (userProfile.email) profileLines.push(`Email: ${userProfile.email}`)
  if (userProfile.sexo) profileLines.push(`Sexo: ${userProfile.sexo}`)
  if (userProfile.tipoDiabetes) profileLines.push(`Tipo de diabetes: ${userProfile.tipoDiabetes}`)
  if (userProfile.edad) profileLines.push(`Edad: ${userProfile.edad}`)

  let y = 30
  profileLines.forEach(line => {
    doc.text(line, 14, y)
    y += 6
  })

  y += 6
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('Registros:', 14, y)
  doc.setFont(undefined, 'normal')
  y += 8

  if (!records || records.length === 0) {
    doc.setFontSize(11)
    doc.text('No hay registros para el período seleccionado.', 14, y)
  } else {
    doc.setFontSize(10)
    const pageHeight = doc.internal.pageSize.height

    // sort records by timestamp ascending
    const sorted = (records || []).slice().sort((a, b) => {
      const da = toDateObj(a.ts) || new Date(0)
      const db = toDateObj(b.ts) || new Date(0)
      return da - db
    })

    // group by date (yyyy-mm-dd)
    const groups = {}
    sorted.forEach(r => {
      const dt = toDateObj(r.ts) || new Date()
      const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
      groups[key] = groups[key] || []
      groups[key].push(r)
    })

    const groupKeys = Object.keys(groups).sort()
    groupKeys.forEach((gk, gi) => {
      const first = groups[gk][0]
      const dateLabel = formatDateFull(first.ts)

      // subtitle: date
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      if (y > pageHeight - 24) { doc.addPage(); y = 20 }
      doc.text(dateLabel, 14, y)
      y += 7
      doc.setFont(undefined, 'normal')

      // entries for that date: show time + main detail; symptoms and notes on subsequent indented lines
      groups[gk].forEach(r => {
        const type = (r.type || r.tipo || '').toString()
        const d = r.data || {}

        // Build main detail without symptoms/notes
        let mainDetail = ''
        if (type === 'Glucosa') {
          const preferredUnit = (userProfile && userProfile.unidadGlucosa) || (d.unit || 'mg/dL')
          const conv = convertGlucose(d.level, d.unit, preferredUnit)
          const disp = formatGlucoseDisplay(conv.value, conv.unit)
          mainDetail = `${disp ? disp + ' ' + (conv.unit || '') : ''}${d.moment ? ' (' + d.moment + ')' : ''}`
        } else if (type === 'Alimentación') {
          mainDetail = `${d.mealType || ''}${d.carbs != null ? ' - CHO: ' + d.carbs : ''}${d.description ? ' - ' + d.description : ''}`
        } else if (type === 'Actividad') {
          mainDetail = `${d.activityType || ''}${d.durationMin != null ? ' - ' + d.durationMin + ' min' : ''}${d.intensity ? ' - ' + d.intensity : ''}`
        } else if (type === 'Medicación') {
          mainDetail = `${d.medType || ''}${d.dose ? ' - Dosis: ' + d.dose : ''}`
        } else if (type === 'Presión arterial') {
          mainDetail = `${d.systolic ?? ''}/${d.diastolic ?? ''} mmHg${d.moment ? ' (' + d.moment + ')' : ''}`
        } else {
          mainDetail = d ? JSON.stringify(d) : ''
        }

        const symptoms = d.symptoms || ''
        const notes = r.notes ?? r.note ?? ''

        const time = formatTime(r.ts)
        const mainLine = `${time} | ${type || 'registro'} | ${mainDetail}`
        const mainLines = doc.splitTextToSize(mainLine, 150)
        mainLines.forEach(ln => {
          if (y > pageHeight - 20) { doc.addPage(); y = 20 }
          doc.text(ln, 18, y)
          y += 6
        })

        // symptoms on a separate indented line (French indent)
        if (symptoms) {
          y += 0
          const symText = `Síntomas: ${symptoms}`
          const symLines = doc.splitTextToSize(symText, 140)
          symLines.forEach(ln => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20 }
            doc.text(ln, 32, y)
            y += 6
          })
        }

        // notes on their own indented line
        if (notes) {
          y += 0
          const noteText = `Notas: ${notes}`
          const noteLines = doc.splitTextToSize(noteText, 140)
          noteLines.forEach(ln => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20 }
            doc.text(ln, 32, y)
            y += 6
          })
        }

        // small gap after each record
        y += 2
      })

      y += 4
    })
  }

  const filename = `informe_${year || 'all'}_${month || 'all'}.pdf`
  doc.save(filename)
}

export async function generateExcelReport(userProfile = {}, records = [], { month, year } = {}) {
  const wb = XLSX.utils.book_new()

  // Profile as first sheet
  const profileData = []
  profileData.push(['Campo', 'Valor'])
  if (userProfile.nombre) profileData.push(['Nombre', userProfile.nombre])
  if (userProfile.email) profileData.push(['Email', userProfile.email])
  if (userProfile.sexo) profileData.push(['Sexo', userProfile.sexo])
  if (userProfile.tipoDiabetes) profileData.push(['Tipo de diabetes', userProfile.tipoDiabetes])
  if (userProfile.edad) profileData.push(['Edad', userProfile.edad])

  const wsProfile = XLSX.utils.aoa_to_sheet(profileData)
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Perfil')

  // Records sheet - include a 'Detalle' column summarizing type-specific fields
  const header = ['Fecha', 'Tipo', 'Detalle', 'Valor', 'Unidad', 'Notas']
  const rows = [header]
  ;(records || []).forEach(r => {
    const type = (r.type || r.tipo || '').toString()
    let detail = ''
    let value = ''
    let unit = ''
    const d = r.data || {}
    if (type === 'Glucosa') {
      // convert to user's preferred unit for Excel as well
      const preferredUnit = (userProfile && userProfile.unidadGlucosa) || (d.unit || 'mg/dL')
      const conv = convertGlucose(d.level, d.unit, preferredUnit)
      value = conv.value === '' ? '' : formatGlucoseDisplay(conv.value, conv.unit)
      unit = conv.unit || ''
      detail = `${d.moment || ''}${d.symptoms ? ' - Síntomas: ' + d.symptoms : ''}`
    } else if (type === 'Alimentación') {
      detail = `${d.mealType || ''}${d.description ? ' - ' + d.description : ''}`
      value = d.carbs ?? ''
      unit = 'g'
    } else if (type === 'Actividad') {
      detail = `${d.activityType || ''}${d.intensity ? ' - ' + d.intensity : ''}`
      value = d.durationMin ?? ''
      unit = 'min'
    } else if (type === 'Medicación') {
      detail = `${d.medType || ''}`
      value = d.dose ?? ''
      unit = ''
    } else if (type === 'Presión arterial') {
      detail = `${d.moment || ''}${d.symptoms ? ' - Síntomas: ' + d.symptoms : ''}`
      value = (d.systolic != null || d.diastolic != null) ? `${d.systolic ?? ''}/${d.diastolic ?? ''}` : ''
      unit = 'mmHg'
    } else {
      detail = d ? JSON.stringify(d) : ''
    }
    rows.push([formatDate(r.ts), type || '', detail, value, unit, r.notes ?? r.note ?? ''])
  })
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Registros')

  // Add separate sheets per record type with detailed columns
  function normalizeTypeString(s) {
    if (!s) return ''
    try {
      return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
    } catch (e) {
      return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    }
  }

  const byType = (records || []).reduce((acc, r) => {
    const t = (r.type || r.tipo || '')
    const key = normalizeTypeString(t) || 'otros'
    acc[key] = acc[key] || []
    acc[key].push(r)
    return acc
  }, {})

  // Glucosa sheet
  if (byType['glucosa'] && byType['glucosa'].length) {
    const hdr = ['Fecha', 'Nivel', 'Unidad', 'Momento', 'Síntomas', 'Notas']
    const data = [hdr]
    byType['glucosa'].forEach(r => {
      const d = r.data || {}
      // convert to user's preferred unit
      const preferredUnit = (userProfile && userProfile.unidadGlucosa) || (d.unit || 'mg/dL')
      const conv = convertGlucose(d.level, d.unit, preferredUnit)
      const disp = conv.value === '' ? '' : formatGlucoseDisplay(conv.value, conv.unit)
      data.push([formatDate(r.ts), disp, conv.unit || '', d.moment ?? '', d.symptoms ?? '', r.notes ?? r.note ?? ''])
    })
    const wsG = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, wsG, 'Glucosa')
  }

  // Alimentación sheet
  if (byType['alimentacion'] && byType['alimentacion'].length) {
    const hdr = ['Fecha', 'Tipo de comida', 'Carbohidratos', 'Descripción', 'Notas']
    const data = [hdr]
    byType['alimentacion'].forEach(r => {
      const d = r.data || {}
      data.push([formatDate(r.ts), d.mealType ?? '', d.carbs ?? '', d.description ?? '', r.notes ?? r.note ?? ''])
    })
    const wsA = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, wsA, 'Alimentacion')
  }

  // Actividad sheet
  if (byType['actividad'] && byType['actividad'].length) {
    const hdr = ['Fecha', 'Tipo actividad', 'Duración (min)', 'Intensidad', 'Notas']
    const data = [hdr]
    byType['actividad'].forEach(r => {
      const d = r.data || {}
      data.push([formatDate(r.ts), d.activityType ?? '', d.durationMin ?? '', d.intensity ?? '', r.notes ?? r.note ?? ''])
    })
    const wsAct = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, wsAct, 'Actividad')
  }

  // Medicación sheet
  if (byType['medicacion'] && byType['medicacion'].length) {
    const hdr = ['Fecha', 'Medicamento', 'Dosis', 'Notas']
    const data = [hdr]
    byType['medicacion'].forEach(r => {
      const d = r.data || {}
      data.push([formatDate(r.ts), d.medType ?? '', d.dose ?? '', r.notes ?? r.note ?? ''])
    })
    const wsM = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, wsM, 'Medicacion')
  }

  // Presión arterial sheet
  if (byType['presion arterial'] && byType['presion arterial'].length) {
    const hdr = ['Fecha', 'Sistólica', 'Diastólica', 'Momento', 'Síntomas', 'Notas']
    const data = [hdr]
    byType['presion arterial'].forEach(r => {
      const d = r.data || {}
      data.push([formatDate(r.ts), d.systolic ?? '', d.diastolic ?? '', d.moment ?? '', d.symptoms ?? '', r.notes ?? r.note ?? ''])
    })
    const wsP = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, wsP, 'Presion arterial')
  }

  const filename = `informe_${year || 'all'}_${month || 'all'}.xlsx`
  XLSX.writeFile(wb, filename)
}

export default { generatePDFReport, generateExcelReport }
