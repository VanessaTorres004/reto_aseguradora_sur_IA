// Tipos de datos para el sistema de detección de fraude

export type RiskLevel = 'ROJO' | 'AMARILLO' | 'VERDE'

export interface Siniestro {
  id: string
  idPoliza: string
  idAsegurado: string
  idProveedor: string
  ramo: string
  cobertura: string
  fechaOcurrencia: string
  fechaReporte: string
  diasReporte: number
  montoReclamado: number
  montoEstimado: number
  sumaAsegurada: number
  estado: string
  sucursal: string
  descripcion: string
  diasDesdeInicio: number
  diasHastaFin: number
  reclamosPrevios: number
  similitudNarrativa: number
  documentosCompletos: boolean
  proveedorListaRestrictiva: boolean
  scoreReglas: number
  scoreML: number
  scoreAnomalia: number
  scoreNLP: number
  scoreFinal: number
  nivelRiesgo: RiskLevel
  alertas: string[]
}

export interface Asegurado {
  id: string
  nombre: string
  tipoDocumento: string
  documento: string
  fechaNacimiento: string
  ciudad: string
  ocupacion: string
  totalSiniestros: number
}

export interface Proveedor {
  id: string
  nombre: string
  tipo: string
  ciudad: string
  listaRestrictiva: boolean
  motivoLista: string | null
  totalServicios: number
}

export interface Poliza {
  id: string
  idAsegurado: string
  ramo: string
  fechaInicio: string
  fechaFin: string
  sumaAsegurada: number
  primaAnual: number
  estado: string
}

export interface DashboardStats {
  totalSiniestros: number
  casosRojos: number
  casosAmarillos: number
  casosVerdes: number
  scorePromedio: number
  scoreMaximo: number
  montoTotalReclamado: number
  proveedoresEnLista: number
}

// Generador de datos sintéticos realistas
const ramos = ['Vehículos', 'Hogar', 'Salud', 'Vida', 'SOAT']
const coberturas: Record<string, string[]> = {
  'Vehículos': ['Robo Total', 'Daños Parciales', 'Pérdida Total', 'Responsabilidad Civil'],
  'Hogar': ['Incendio', 'Robo', 'Inundación', 'Terremoto'],
  'Salud': ['Hospitalización', 'Cirugía', 'Tratamiento Ambulatorio', 'Medicamentos'],
  'Vida': ['Fallecimiento', 'Invalidez Total', 'Enfermedades Graves'],
  'SOAT': ['Accidente de Tránsito', 'Gastos Médicos', 'Incapacidad']
}
const estados = ['Pendiente', 'En Revisión', 'Aprobado', 'Rechazado', 'Pagado']
const sucursales = ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Loja', 'Manta', 'Machala']
const ciudades = ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Loja', 'Manta', 'Machala', 'Riobamba', 'Ibarra', 'Esmeraldas']
const tiposProveedor = ['Taller Automotriz', 'Clínica', 'Hospital', 'Laboratorio', 'Centro Diagnóstico', 'Farmacia']

const nombresProveedores = [
  'Taller AutoService Plus', 'Mecánica Express', 'CarFix Center', 'TallerPro 2000',
  'Clínica Santa María', 'Hospital del Valle', 'Centro Médico Central', 'Laboratorio San José',
  'Farmacia Universal', 'Centro de Diagnóstico ABC', 'Taller 777', 'ServAuto 888', 'MecánicaRápida 999'
]

const descripciones = [
  'El vehículo fue sustraído del estacionamiento del centro comercial mientras realizaba compras.',
  'Se reporta colisión lateral en la Av. Principal a las 18:30 horas.',
  'Incendio en la cocina provocado por cortocircuito en el sistema eléctrico.',
  'Robo de pertenencias del domicilio durante ausencia por vacaciones.',
  'Paciente requiere intervención quirúrgica por apendicitis aguda.',
  'Hospitalización por 5 días debido a complicaciones respiratorias.',
  'Daños por granizo severo en el vehículo estacionado en vía pública.',
  'Accidente de tránsito en intersección con otro vehículo.',
  'Tratamiento oncológico requiere medicamentos especializados.',
  'Pérdida total del vehículo por inundación durante temporada de lluvias.',
  'El vehículo fue robado mientras estaba estacionado frente al domicilio.',
  'Choque posterior en semáforo de la Av. Central.',
  'Incendio parcial en bodega del hogar por fuga de gas.',
]

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + seededRandom() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)]
}

// Generador de números aleatorios con semilla para consistencia entre servidor y cliente
let seed = 12345
function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

function randomBetween(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min
}

// Generar proveedores
export function generateProveedores(count: number): Proveedor[] {
  const proveedores: Proveedor[] = []
  const listaRestrictiva = ['Taller 777', 'ServAuto 888', 'MecánicaRápida 999']
  
  for (let i = 0; i < count; i++) {
    const nombre = nombresProveedores[i % nombresProveedores.length] + (i >= nombresProveedores.length ? ` ${i}` : '')
    const enLista = listaRestrictiva.some(lr => nombre.includes(lr))
    
    proveedores.push({
      id: `PROV-${String(i + 1).padStart(3, '0')}`,
      nombre,
      tipo: randomChoice(tiposProveedor),
      ciudad: randomChoice(ciudades),
      listaRestrictiva: enLista,
      motivoLista: enLista ? 'Patrón de facturación sospechoso' : null,
      totalServicios: randomBetween(5, 150)
    })
  }
  
  return proveedores
}

// Generar asegurados
export function generateAsegurados(count: number): Asegurado[] {
  const nombres = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Luis Rodríguez', 
    'Carmen Sánchez', 'José González', 'Laura Fernández', 'Pedro Díaz', 'Isabel Torres',
    'Miguel Ruiz', 'Rosa Morales', 'Francisco Vargas', 'Elena Castro', 'Alberto Mendoza']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `ASEG-${String(i + 1).padStart(4, '0')}`,
    nombre: nombres[i % nombres.length] + (i >= nombres.length ? ` ${Math.floor(i / nombres.length) + 1}` : ''),
    tipoDocumento: seededRandom() > 0.2 ? 'Cédula' : 'Pasaporte',
    documento: String(1700000000 + i),
    fechaNacimiento: randomDate(new Date(1960, 0, 1), new Date(2000, 0, 1)),
    ciudad: randomChoice(ciudades),
    ocupacion: randomChoice(['Empleado', 'Independiente', 'Empresario', 'Jubilado', 'Estudiante']),
    totalSiniestros: randomBetween(0, 5)
  }))
}

// Generar pólizas
export function generatePolizas(asegurados: Asegurado[]): Poliza[] {
  const polizas: Poliza[] = []
  
  asegurados.forEach((aseg, i) => {
    const numPolizas = randomBetween(1, 3)
    for (let j = 0; j < numPolizas; j++) {
      const ramo = randomChoice(ramos)
      const fechaInicio = randomDate(new Date(2024, 0, 1), new Date(2025, 6, 1))
      const fechaFin = new Date(fechaInicio)
      fechaFin.setFullYear(fechaFin.getFullYear() + 1)
      
      polizas.push({
        id: `POL-${String(polizas.length + 1).padStart(5, '0')}`,
        idAsegurado: aseg.id,
        ramo,
        fechaInicio,
        fechaFin: fechaFin.toISOString().split('T')[0],
        sumaAsegurada: randomBetween(10000, 150000),
        primaAnual: randomBetween(200, 3000),
        estado: seededRandom() > 0.1 ? 'Vigente' : 'Vencida'
      })
    }
  })
  
  return polizas
}

// Función para calcular el score final y nivel de riesgo
function calcularScores(params: {
  diasDesdeInicio: number
  diasHastaFin: number
  diasReporte: number
  reclamosPrevios: number
  similitudNarrativa: number
  montoReclamado: number
  sumaAsegurada: number
  montoEstimado: number
  proveedorListaRestrictiva: boolean
  documentosCompletos: boolean
  esRobo: boolean
}): { scoreReglas: number; scoreFinal: number; nivelRiesgo: RiskLevel } {
  let scoreReglas = 0
  
  // 1. Reclamo cercano al borde de vigencia (inicio)
  if (params.diasDesdeInicio <= 10) scoreReglas += 8
  else if (params.diasDesdeInicio <= 30) scoreReglas += 4
  
  // 2. Reclamo cercano al fin de vigencia
  if (params.diasHastaFin <= 10) scoreReglas += 8
  else if (params.diasHastaFin <= 30) scoreReglas += 4
  
  // 3. Demora denuncia (robo)
  if (params.esRobo && params.diasReporte > 2) scoreReglas += 8
  else if (params.esRobo && params.diasReporte >= 1) scoreReglas += 4
  
  // 4. Alta frecuencia asegurado
  if (params.reclamosPrevios >= 3) scoreReglas += 8
  else if (params.reclamosPrevios === 2) scoreReglas += 4
  
  // 5. Proveedor en lista restrictiva
  if (params.proveedorListaRestrictiva) scoreReglas += 10
  
  // 6. Documentos incompletos
  if (!params.documentosCompletos) scoreReglas += 4
  
  // 7. Narrativas similares
  if (params.similitudNarrativa > 0.85) scoreReglas += 8
  else if (params.similitudNarrativa >= 0.70) scoreReglas += 4
  
  // 8. Monto cercano a suma asegurada
  const ratioSA = params.montoReclamado / params.sumaAsegurada
  if (ratioSA >= 0.95) scoreReglas += 4
  
  // 9. Reporte tardío
  if (params.diasReporte > 7) scoreReglas += 5
  else if (params.diasReporte >= 4) scoreReglas += 3
  
  // 10. Sobrecosto
  const ratioMonto = params.montoReclamado / params.montoEstimado
  if (ratioMonto > 1.5) scoreReglas += 6
  else if (ratioMonto > 1.2) scoreReglas += 3
  
  // Normalizar a 0-100
  const scoreReglasNorm = Math.min((scoreReglas / 65) * 100, 100)
  
  // Score ML simulado (correlacionado con reglas pero con algo de variación)
  const scoreML = Math.min(scoreReglasNorm * (0.8 + seededRandom() * 0.4), 100)
  
  // Score anomalía
  const scoreAnomalia = seededRandom() * 30 + (scoreReglasNorm > 50 ? 40 : 0)
  
  // Score NLP
  const scoreNLP = params.similitudNarrativa > 0.85 ? 100 : 
                   params.similitudNarrativa > 0.70 ? 60 :
                   params.similitudNarrativa > 0.50 ? 30 : 0
  
  // Score final ponderado
  const scoreFinal = (
    0.40 * scoreReglasNorm +
    0.35 * scoreML +
    0.15 * scoreAnomalia +
    0.10 * scoreNLP
  )
  
  // Determinar nivel de riesgo
  let nivelRiesgo: RiskLevel = 'VERDE'
  if (scoreFinal >= 76) nivelRiesgo = 'ROJO'
  else if (scoreFinal >= 41) nivelRiesgo = 'AMARILLO'
  
  return {
    scoreReglas: Math.round(scoreReglasNorm * 10) / 10,
    scoreFinal: Math.round(scoreFinal * 10) / 10,
    nivelRiesgo
  }
}

// Generar alertas basadas en el siniestro
function generarAlertas(siniestro: Partial<Siniestro>): string[] {
  const alertas: string[] = []
  
  if (siniestro.diasDesdeInicio! <= 30) {
    alertas.push(`Siniestro ocurrido ${siniestro.diasDesdeInicio} dias desde inicio de poliza`)
  }
  if (siniestro.diasHastaFin! <= 30) {
    alertas.push(`Siniestro ocurrido ${siniestro.diasHastaFin} dias antes del fin de poliza`)
  }
  if (siniestro.proveedorListaRestrictiva) {
    alertas.push('Proveedor en Lista Restrictiva')
  }
  if (!siniestro.documentosCompletos) {
    alertas.push('Documentacion incompleta')
  }
  if (siniestro.reclamosPrevios! >= 3) {
    alertas.push(`Asegurado con ${siniestro.reclamosPrevios} reclamos previos en 18 meses`)
  }
  if (siniestro.similitudNarrativa! > 0.70) {
    alertas.push(`Narrativa similar a otro reclamo (${Math.round(siniestro.similitudNarrativa! * 100)}% similitud)`)
  }
  if (siniestro.montoReclamado! / siniestro.sumaAsegurada! >= 0.95) {
    alertas.push('Monto reclamado mayor o igual al 95% de la suma asegurada')
  }
  if (siniestro.diasReporte! > 7) {
    alertas.push(`Reporte tardio: ${siniestro.diasReporte} dias despues del evento`)
  }
  
  if (alertas.length === 0) {
    alertas.push('Sin alertas significativas detectadas')
  }
  
  return alertas
}

// Generar siniestros
export function generateSiniestros(
  count: number,
  polizas: Poliza[],
  proveedores: Proveedor[]
): Siniestro[] {
  const siniestros: Siniestro[] = []
  
  // Asegurar que algunos casos sean de alto riesgo
  const casosAltoRiesgo = Math.floor(count * 0.15)
  const casosMedioRiesgo = Math.floor(count * 0.25)
  
  for (let i = 0; i < count; i++) {
    const poliza = randomChoice(polizas)
    const ramo = poliza.ramo
    const cobertura = randomChoice(coberturas[ramo])
    const esRobo = cobertura.toLowerCase().includes('robo')
    
    // Determinar si es un caso sospechoso
    const esCasoAltoRiesgo = i < casosAltoRiesgo
    const esCasoMedioRiesgo = i >= casosAltoRiesgo && i < casosAltoRiesgo + casosMedioRiesgo
    
    // Seleccionar proveedor (casos sospechosos más probables de usar proveedores en lista)
    let proveedor: Proveedor
    if (esCasoAltoRiesgo && seededRandom() > 0.3) {
      proveedor = proveedores.find(p => p.listaRestrictiva) || randomChoice(proveedores)
    } else {
      proveedor = randomChoice(proveedores)
    }
    
    const sumaAsegurada = poliza.sumaAsegurada
    const montoEstimado = randomBetween(1000, Math.floor(sumaAsegurada * 0.7))
    
    // Casos sospechosos tienden a tener montos más altos
    let montoReclamado: number
    if (esCasoAltoRiesgo) {
      montoReclamado = randomBetween(Math.floor(sumaAsegurada * 0.8), sumaAsegurada)
    } else if (esCasoMedioRiesgo) {
      montoReclamado = randomBetween(Math.floor(montoEstimado * 1.1), Math.floor(sumaAsegurada * 0.8))
    } else {
      montoReclamado = randomBetween(Math.floor(montoEstimado * 0.8), Math.floor(montoEstimado * 1.2))
    }
    
    const diasDesdeInicio = esCasoAltoRiesgo ? randomBetween(1, 15) : randomBetween(30, 300)
    const diasHastaFin = esCasoAltoRiesgo ? randomBetween(5, 20) : randomBetween(30, 300)
    const diasReporte = esCasoAltoRiesgo ? randomBetween(5, 15) : randomBetween(0, 5)
    const reclamosPrevios = esCasoAltoRiesgo ? randomBetween(2, 5) : randomBetween(0, 2)
    const similitudNarrativa = esCasoAltoRiesgo ? 0.75 + seededRandom() * 0.2 : seededRandom() * 0.5
    const documentosCompletos = esCasoAltoRiesgo ? seededRandom() > 0.6 : seededRandom() > 0.2
    
    const fechaOcurrencia = randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31))
    const fechaReporte = new Date(fechaOcurrencia)
    fechaReporte.setDate(fechaReporte.getDate() + diasReporte)
    
    const scores = calcularScores({
      diasDesdeInicio,
      diasHastaFin,
      diasReporte,
      reclamosPrevios,
      similitudNarrativa,
      montoReclamado,
      sumaAsegurada,
      montoEstimado,
      proveedorListaRestrictiva: proveedor.listaRestrictiva,
      documentosCompletos,
      esRobo
    })
    
    const siniestro: Partial<Siniestro> = {
      id: `SIN-${String(i + 1).padStart(5, '0')}`,
      idPoliza: poliza.id,
      idAsegurado: poliza.idAsegurado,
      idProveedor: proveedor.id,
      ramo,
      cobertura,
      fechaOcurrencia,
      fechaReporte: fechaReporte.toISOString().split('T')[0],
      diasReporte,
      montoReclamado,
      montoEstimado,
      sumaAsegurada,
      estado: randomChoice(estados),
      sucursal: randomChoice(sucursales),
      descripcion: randomChoice(descripciones),
      diasDesdeInicio,
      diasHastaFin,
      reclamosPrevios,
      similitudNarrativa: Math.round(similitudNarrativa * 100) / 100,
      documentosCompletos,
      proveedorListaRestrictiva: proveedor.listaRestrictiva,
      scoreReglas: scores.scoreReglas,
      scoreML: Math.round((scores.scoreFinal * 0.9 + seededRandom() * 10) * 10) / 10,
      scoreAnomalia: Math.round(seededRandom() * 50 + (scores.scoreFinal > 50 ? 30 : 0)),
      scoreNLP: Math.round(similitudNarrativa > 0.7 ? 60 + seededRandom() * 40 : seededRandom() * 30),
      scoreFinal: scores.scoreFinal,
      nivelRiesgo: scores.nivelRiesgo
    }
    
    siniestro.alertas = generarAlertas(siniestro)
    siniestros.push(siniestro as Siniestro)
  }
  
  // Ordenar por score final descendente
  return siniestros.sort((a, b) => b.scoreFinal - a.scoreFinal)
}

// Calcular estadísticas del dashboard
export function calculateStats(siniestros: Siniestro[], proveedores: Proveedor[]): DashboardStats {
  return {
    totalSiniestros: siniestros.length,
    casosRojos: siniestros.filter(s => s.nivelRiesgo === 'ROJO').length,
    casosAmarillos: siniestros.filter(s => s.nivelRiesgo === 'AMARILLO').length,
    casosVerdes: siniestros.filter(s => s.nivelRiesgo === 'VERDE').length,
    scorePromedio: Math.round(siniestros.reduce((acc, s) => acc + s.scoreFinal, 0) / siniestros.length * 10) / 10,
    scoreMaximo: Math.max(...siniestros.map(s => s.scoreFinal)),
    montoTotalReclamado: siniestros.reduce((acc, s) => acc + s.montoReclamado, 0),
    proveedoresEnLista: proveedores.filter(p => p.listaRestrictiva).length
  }
}

// Datos pre-generados para uso en la aplicación
export const proveedores = generateProveedores(30)
export const asegurados = generateAsegurados(200)
export const polizas = generatePolizas(asegurados)
export const siniestros = generateSiniestros(500, polizas, proveedores)
export const dashboardStats = calculateStats(siniestros, proveedores)

// Utilidades para filtrado
export function filterSiniestros(
  siniestros: Siniestro[],
  filters: {
    ramo?: string
    sucursal?: string
    nivelRiesgo?: RiskLevel
    searchTerm?: string
  }
): Siniestro[] {
  return siniestros.filter(s => {
    if (filters.ramo && s.ramo !== filters.ramo) return false
    if (filters.sucursal && s.sucursal !== filters.sucursal) return false
    if (filters.nivelRiesgo && s.nivelRiesgo !== filters.nivelRiesgo) return false
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      return (
        s.id.toLowerCase().includes(term) ||
        s.idAsegurado.toLowerCase().includes(term) ||
        s.descripcion.toLowerCase().includes(term)
      )
    }
    return true
  })
}

// Obtener datos para el grafo de relaciones
export function getNetworkData() {
  const nodes: Array<{
    id: string
    type: 'asegurado' | 'proveedor' | 'siniestro'
    label: string
    riesgo?: RiskLevel
    score?: number
    enLista?: boolean
  }> = []
  
  const edges: Array<{
    source: string
    target: string
    tipo: 'asegurado-siniestro' | 'siniestro-proveedor'
    alerta: boolean
  }> = []
  
  // Solo incluir siniestros de alto y medio riesgo para el grafo
  const siniestrosFiltrados = siniestros.filter(s => s.nivelRiesgo !== 'VERDE')
  
  const aseguradosUnicos = new Set<string>()
  const proveedoresUnicos = new Set<string>()
  
  siniestrosFiltrados.forEach(s => {
    aseguradosUnicos.add(s.idAsegurado)
    proveedoresUnicos.add(s.idProveedor)
    
    nodes.push({
      id: s.id,
      type: 'siniestro',
      label: s.id,
      riesgo: s.nivelRiesgo,
      score: s.scoreFinal
    })
  })
  
  aseguradosUnicos.forEach(id => {
    const aseg = asegurados.find(a => a.id === id)
    nodes.push({
      id,
      type: 'asegurado',
      label: aseg?.nombre || id
    })
  })
  
  proveedoresUnicos.forEach(id => {
    const prov = proveedores.find(p => p.id === id)
    nodes.push({
      id,
      type: 'proveedor',
      label: prov?.nombre || id,
      enLista: prov?.listaRestrictiva
    })
  })
  
  siniestrosFiltrados.forEach(s => {
    edges.push({
      source: s.idAsegurado,
      target: s.id,
      tipo: 'asegurado-siniestro',
      alerta: s.nivelRiesgo === 'ROJO'
    })
    
    edges.push({
      source: s.id,
      target: s.idProveedor,
      tipo: 'siniestro-proveedor',
      alerta: s.proveedorListaRestrictiva
    })
  })
  
  return { nodes, edges }
}

// Obtener lista única de ramos
export function getRamos(): string[] {
  return [...new Set(siniestros.map(s => s.ramo))]
}

// Obtener lista única de sucursales
export function getSucursales(): string[] {
  return [...new Set(siniestros.map(s => s.sucursal))]
}
