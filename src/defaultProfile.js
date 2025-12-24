const defaultProfile = {
  tipoDiabetes: 'Sin especificar',
  anoDiagnostico: '',
  sexo: 'Sin especificar',
  terapiaInsulina: 'Sin especificar',
  unidadGlucosa: 'mg/dL',
  unidadCarbohidratos: 'Gramos',
  medicamentos: [],
  muyAlto: 180,
  intervaloIdealMin: 70,
  intervaloIdealMax: 140,
  muyBajo: 54,
  unidadPeso: 'kg',
  pesoDeseado: '',
  unidadAltura: 'cm',
  altura: '',
  unidadHbA1c: '%',
  hba1c: ''
}

export default defaultProfile

// Rangos por defecto para presión arterial (mmHg)
// Se usan en el componente Registro para colorear: success (verde), warning (amarillo), error (rojo)
defaultProfile.paSistolicaIdealMin = 90
defaultProfile.paSistolicaIdealMax = 120
defaultProfile.paSistolicaAlto = 140
defaultProfile.paSistolicaBajo = 80

defaultProfile.paDiastolicaIdealMin = 60
defaultProfile.paDiastolicaIdealMax = 80
defaultProfile.paDiastolicaAlto = 90
defaultProfile.paDiastolicaBajo = 50
