/**
 * Machine Learning Module para Fraud Detection
 * Implementa Regresión Logística, Detección de Anomalías y Feature Engineering
 */

import { siniestros } from '@/lib/data'

/**
 * Features extraídas para ML
 */
export interface MLFeatures {
  // Características de monto
  montoNormalizado: number // 0-1
  montoEsAnomalía: boolean
  montoZScore: number

  // Características de proveedor
  proveedorRiesgoHistórico: number // 0-1
  proveedorEnListaRestrictiva: boolean
  proveedorFrecuencia: number

  // Características de asegurado
  aseguradoReclamosAnteriores: number
  aseguradoTasaFraude: number // histórica

  // Características de patrón temporal
  diasDesdeÚltimoReclamo: number
  reclamsEnÚltimos30Días: number
  esFechaRara: boolean

  // Características de documentación
  documentosCompletos: boolean
  similitudNarrativa: number // 0-1

  // Características de contexto
  ramoRiesgo: number // 0-1 (vehículos = más riesgo)
  montoVsSumaAsegurada: number // ratio
  diasReporteDemora: number // delay en reporte
}

/**
 * Calcula estadísticas de montos en el dataset
 */
function calculateMontoStats() {
  const montos = siniestros.map(s => s.montoReclamado).filter(m => m > 0)

  if (montos.length === 0) {
    return { mean: 10000, std: 5000, min: 0, max: 100000 }
  }

  const mean = montos.reduce((a, b) => a + b, 0) / montos.length
  const variance = montos.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / montos.length
  const std = Math.sqrt(variance)

  return {
    mean,
    std,
    min: Math.min(...montos),
    max: Math.max(...montos),
    q1: montos.sort((a, b) => a - b)[Math.floor(montos.length * 0.25)],
    q3: montos.sort((a, b) => a - b)[Math.floor(montos.length * 0.75)],
  }
}

/**
 * Detecta si un monto es anomalía (IQR method)
 */
function esMontoAnomalía(monto: number): boolean {
  const stats = calculateMontoStats()

  if (
    stats.q1 === undefined ||
    stats.q3 === undefined ||
    !Number.isFinite(stats.q1) ||
    !Number.isFinite(stats.q3)
  ) {
    return false
  }

  const iqr = stats.q3 - stats.q1

  if (!Number.isFinite(iqr) || iqr <= 0) {
    return false
  }

  const lowerBound = stats.q1 - 1.5 * iqr
  const upperBound = stats.q3 + 1.5 * iqr

  return monto < lowerBound || monto > upperBound
}

/**
 * Calcula Z-score para un monto
 */
function calculateMontoZScore(monto: number): number {
  const stats = calculateMontoStats()
  if (stats.std === 0) return 0
  return (monto - stats.mean) / stats.std
}

/**
 * Normaliza monto a 0-1
 */
function normalizarMonto(monto: number): number {
  const stats = calculateMontoStats()
  const normalized = (monto - stats.min) / (stats.max - stats.min)
  return Math.max(0, Math.min(1, normalized))
}

/**
 * Calcula riesgo histórico de un proveedor
 */
function calculateProveedorRiesgo(idProveedor: string): number {
  const proveedorCasos = siniestros.filter(s => s.idProveedor === idProveedor)

  if (proveedorCasos.length === 0) return 0.5 // Default neutral

  const casosRojos = proveedorCasos.filter(s => s.nivelRiesgo === 'ROJO').length
  const tasaRojos = casosRojos / proveedorCasos.length

  const scorePromedio = proveedorCasos.reduce((sum, s) => sum + s.scoreFinal, 0) / proveedorCasos.length
  const riesgoScore = scorePromedio / 100

  // Combinar: 60% scoring histórico, 40% tasa de rojos
  return Math.min(1, (riesgoScore * 0.6) + (tasaRojos * 0.4))
}

/**
 * Calcula tasa histórica de fraude de un asegurado
 */
function calculateAseguradoFraudRate(idAsegurado: string): number {
  const aseguradoCasos = siniestros.filter(s => s.idAsegurado === idAsegurado)

  if (aseguradoCasos.length === 0) return 0.05 // Prior default: 5%

  const casosRojos = aseguradoCasos.filter(s => s.nivelRiesgo === 'ROJO').length
  return casosRojos / aseguradoCasos.length
}

/**
 * Calcula días desde el último reclamo
 */
function calculateDíasDesdeÚltimoReclamo(idAsegurado: string, fechaActual: Date): number {
  const otrosCasos = siniestros.filter(s => s.idAsegurado === idAsegurado)

  if (otrosCasos.length === 0) return 999 // Muy antiguo = menos riesgo

  const fechas = otrosCasos
    .map(c => new Date(c.fechaOcurrencia))
    .sort((a, b) => b.getTime() - a.getTime())

  const últimaFecha = fechas[0]
  const días = Math.floor((fechaActual.getTime() - últimaFecha.getTime()) / (1000 * 60 * 60 * 24))

  return Math.max(0, días)
}

/**
 * Calcula reclamos en últimos 30 días
 */
function calculateReclamsÚltimos30Días(idAsegurado: string): number {
  const hace30Días = new Date()
  hace30Días.setDate(hace30Días.getDate() - 30)

  return siniestros.filter(s =>
    s.idAsegurado === idAsegurado && new Date(s.fechaOcurrencia) > hace30Días
  ).length
}

/**
 * Detecta si una fecha es "rara" (fin de mes, viernes 13, etc)
 */
function esFechaRara(fecha: string): boolean {
  try {
    const date = new Date(fecha)
    const day = date.getDate()
    const dayOfWeek = date.getDay()
    const month = date.getMonth()

    // Fin de mes
    if (day >= 28) return true

    // Viernes 13
    if (dayOfWeek === 5 && day === 13) return true

    // Períodos festivos (Navidad, Año Nuevo, etc)
    if ((month === 11 && day >= 20) || (month === 0 && day <= 10)) return true

    return false
  } catch {
    return false
  }
}

/**
 * Calcula similitud de narrativa (simple token overlap)
 */
function calculateNarrativaSimilarity(descripcion: string, idSiniestro: string): number {
  const tokens = descripcion.toLowerCase().split(/\s+/).filter(t => t.length > 3)

  if (tokens.length === 0) return 0

  const otrosCasos = siniestros.filter(s => s.id !== idSiniestro).slice(0, 50) // Sample

  let similitudes = 0

  for (const caso of otrosCasos) {
    const otrosTokens = caso.descripcion.toLowerCase().split(/\s+/).filter(t => t.length > 3)
    const coincidencias = tokens.filter(t => otrosTokens.includes(t)).length

    similitudes += coincidencias / Math.max(tokens.length, otrosTokens.length)
  }

  return Math.min(1, similitudes / Math.max(1, otrosCasos.length))
}

/**
 * Asigna riesgo al ramo
 */
function getRamoRiesgo(ramo: string): number {
  const riesgoRamos: Record<string, number> = {
    'Vehículos': 0.7,
    'Salud': 0.5,
    'Vida': 0.4,
    'Hogar': 0.6,
    'Responsabilidad Civil': 0.5,
    'default': 0.5,
  }

  return riesgoRamos[ramo] ?? riesgoRamos['default']
}

/**
 * Extrae features para ML
 */
export function extractMLFeatures(
  siniestro: (typeof siniestros)[0],
  asegurado?: { nombre: string; documento: string }
): MLFeatures {
  const ahora = new Date()

  return {
    // Características de monto
    montoNormalizado: normalizarMonto(siniestro.montoReclamado),
    montoEsAnomalía: esMontoAnomalía(siniestro.montoReclamado),
    montoZScore: calculateMontoZScore(siniestro.montoReclamado),

    // Características de proveedor
    proveedorRiesgoHistórico: calculateProveedorRiesgo(siniestro.idProveedor),
    proveedorEnListaRestrictiva: siniestro.proveedorListaRestrictiva,
    proveedorFrecuencia: siniestros.filter(s => s.idProveedor === siniestro.idProveedor).length,

    // Características de asegurado
    aseguradoReclamosAnteriores: siniestro.reclamosPrevios,
    aseguradoTasaFraude: calculateAseguradoFraudRate(siniestro.idAsegurado),

    // Características temporales
    diasDesdeÚltimoReclamo: calculateDíasDesdeÚltimoReclamo(siniestro.idAsegurado, ahora),
    reclamsEnÚltimos30Días: calculateReclamsÚltimos30Días(siniestro.idAsegurado),
    esFechaRara: esFechaRara(siniestro.fechaOcurrencia),

    // Características de documentación
    documentosCompletos: siniestro.documentosCompletos,
    similitudNarrativa: calculateNarrativaSimilarity(siniestro.descripcion, siniestro.id),

    // Características de contexto
    ramoRiesgo: getRamoRiesgo(siniestro.ramo),
    montoVsSumaAsegurada: siniestro.sumaAsegurada > 0
      ? siniestro.montoReclamado / siniestro.sumaAsegurada
      : 0.5,
    diasReporteDemora: siniestro.diasReporte,
  }
}

/**
 * Pesos de la Regresión Logística (entrenados con datos históricos simulados)
 */
const LOGISTIC_REGRESSION_WEIGHTS = {
  montoNormalizado: 0.15,
  montoEsAnomalía: 0.35,
  montoZScore: 0.08,
  proveedorRiesgoHistórico: 0.18,
  proveedorEnListaRestrictiva: 0.22,
  proveedorFrecuencia: 0.05,
  aseguradoReclamosAnteriores: 0.12,
  aseguradoTasaFraude: 0.25,
  diasDesdeÚltimoReclamo: -0.08, // Negativo: más días = menos riesgo
  reclamsEnÚltimos30Días: 0.20,
  esFechaRara: 0.10,
  documentosCompletos: -0.15, // Negativo: documentos completos = menos riesgo
  similitudNarrativa: 0.12,
  ramoRiesgo: 0.10,
  montoVsSumaAsegurada: 0.14,
  diasReporteDemora: 0.08,
  intercept: -0.5, // Bias
}

/**
 * Regresión logística: calcula probabilidad de fraude (0-1)
 */
export function logisticRegressionScore(features: MLFeatures): number {
  let z =
    LOGISTIC_REGRESSION_WEIGHTS.montoNormalizado * features.montoNormalizado +
    LOGISTIC_REGRESSION_WEIGHTS.montoEsAnomalía * (features.montoEsAnomalía ? 1 : 0) +
    LOGISTIC_REGRESSION_WEIGHTS.montoZScore * Math.min(features.montoZScore, 3) +
    LOGISTIC_REGRESSION_WEIGHTS.proveedorRiesgoHistórico * features.proveedorRiesgoHistórico +
    LOGISTIC_REGRESSION_WEIGHTS.proveedorEnListaRestrictiva * (features.proveedorEnListaRestrictiva ? 1 : 0) +
    LOGISTIC_REGRESSION_WEIGHTS.proveedorFrecuencia * Math.log(features.proveedorFrecuencia + 1) / 5 +
    LOGISTIC_REGRESSION_WEIGHTS.aseguradoReclamosAnteriores * features.aseguradoReclamosAnteriores / 10 +
    LOGISTIC_REGRESSION_WEIGHTS.aseguradoTasaFraude * features.aseguradoTasaFraude +
    LOGISTIC_REGRESSION_WEIGHTS.diasDesdeÚltimoReclamo * (1 - Math.min(features.diasDesdeÚltimoReclamo / 365, 1)) +
    LOGISTIC_REGRESSION_WEIGHTS.reclamsEnÚltimos30Días * Math.min(features.reclamsEnÚltimos30Días / 3, 1) +
    LOGISTIC_REGRESSION_WEIGHTS.esFechaRara * (features.esFechaRara ? 1 : 0) +
    LOGISTIC_REGRESSION_WEIGHTS.documentosCompletos * (features.documentosCompletos ? 1 : 0) +
    LOGISTIC_REGRESSION_WEIGHTS.similitudNarrativa * features.similitudNarrativa +
    LOGISTIC_REGRESSION_WEIGHTS.ramoRiesgo * features.ramoRiesgo +
    LOGISTIC_REGRESSION_WEIGHTS.montoVsSumaAsegurada * Math.min(features.montoVsSumaAsegurada, 1.5) +
    LOGISTIC_REGRESSION_WEIGHTS.diasReporteDemora * Math.min(features.diasReporteDemora / 30, 1) +
    LOGISTIC_REGRESSION_WEIGHTS.intercept

  // Función sigmoide: convierte z a probabilidad (0-1)
  const probabilidad = 1 / (1 + Math.exp(-z))

  return Math.max(0, Math.min(1, probabilidad))
}

/**
 * Detección de anomalías con Isolation Forest (simulado)
 */
export function anomalyScore(features: MLFeatures): number {
  let anomalyPoints = 0
  const totalChecks = 10

  // Monto
  if (features.montoEsAnomalía) anomalyPoints++
  if (features.montoZScore > 2.5) anomalyPoints++
  if (features.montoZScore < -1.5) anomalyPoints++ // Monto muy bajo raro

  // Proveedor
  if (features.proveedorRiesgoHistórico > 0.8) anomalyPoints++
  if (features.proveedorFrecuencia > 100) anomalyPoints++ // Proveedor con muchos casos

  // Asegurado
  if (features.aseguradoTasaFraude > 0.3) anomalyPoints++
  if (features.aseguradoReclamosAnteriores > 5) anomalyPoints++

  // Temporal
  if (features.reclamsEnÚltimos30Días > 2) anomalyPoints++
  if (features.diasDesdeÚltimoReclamo < 7) anomalyPoints++ // Reclamos muy frecuentes

  // Ratio
  if (features.montoVsSumaAsegurada > 1.2) anomalyPoints++ // Reclama más que la póliza

  // Convertir a score 0-1
  return anomalyPoints / totalChecks
}

/**
 * Calcula ensemble score: combinación de regresión logística + anomalía
 */
export function ensembleMLScore(siniestro: (typeof siniestros)[0]): number {
  const features = extractMLFeatures(siniestro)

  const logisticScore = logisticRegressionScore(features)
  const anomalyAnomalyScore = anomalyScore(features)

  // Ensemble: 70% regresión logística, 30% anomalía
  const ensembleScore = (logisticScore * 0.7) + (anomalyAnomalyScore * 0.3)

  // Convertir a 0-100
  return Math.round(ensembleScore * 100)
}

/**
 * Explicabilidad: explica qué factores contribuyeron al score
 */
export function explainMLScore(features: MLFeatures, probabilidad: number): {
  explanation: string
  topFactors: Array<{ factor: string; weight: number; value: number }>
} {
  const factorContributions = [
    { factor: 'Monto es Anomalía', weight: LOGISTIC_REGRESSION_WEIGHTS.montoEsAnomalía, value: features.montoEsAnomalía ? 1 : 0 },
    { factor: 'Riesgo Histórico Proveedor', weight: LOGISTIC_REGRESSION_WEIGHTS.proveedorRiesgoHistórico, value: features.proveedorRiesgoHistórico },
    { factor: 'Proveedor en Lista Restrictiva', weight: LOGISTIC_REGRESSION_WEIGHTS.proveedorEnListaRestrictiva, value: features.proveedorEnListaRestrictiva ? 1 : 0 },
    { factor: 'Tasa Fraude Asegurado', weight: LOGISTIC_REGRESSION_WEIGHTS.aseguradoTasaFraude, value: features.aseguradoTasaFraude },
    { factor: 'Reclamos Últimos 30 Días', weight: LOGISTIC_REGRESSION_WEIGHTS.reclamsEnÚltimos30Días, value: Math.min(features.reclamsEnÚltimos30Días / 3, 1) },
    { factor: 'Riesgo del Ramo', weight: LOGISTIC_REGRESSION_WEIGHTS.ramoRiesgo, value: features.ramoRiesgo },
  ]

  const sortedFactors = factorContributions
    .map(f => ({
      ...f,
      contribution: Math.abs(f.weight * f.value),
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(({ factor, weight, value }) => ({ factor, weight, value }))

  const probabilidadPorcentaje = Math.round(probabilidad * 100)

  const explanation = `ML Score: ${probabilidadPorcentaje}% de probabilidad de fraude. ` +
    `Principales factores: ${sortedFactors.map(f => f.factor).join(', ')}. ` +
    `Modelo: Regresión Logística (Ensemble 70%) + Detección de Anomalías (30%).`

  return { explanation, topFactors: sortedFactors }
}
