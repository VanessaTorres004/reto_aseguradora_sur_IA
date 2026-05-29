// Analizador de documentos para prototipo hackathon
// Genera alertas de revisión, no acusaciones de fraude.
// En producción, este módulo debería integrarse con un modelo ML real,
// extracción documental robusta y una base de datos centralizada.

export interface UploadedCase {
  id: string
  fileName: string
  type: 'factura' | 'poliza' | 'reporte' | 'otro'
  content: string
  uploadedAt: Date
  analysis?: FraudAnalysis
}

export interface FraudAnalysis {
  scoreFinal: number
  nivelRiesgo: 'ROJO' | 'AMARILLO' | 'VERDE'
  alertas: string[]
  recomendaciones: string[]
  detalles: {
    montoDetectado?: number
    fechaEvento?: string
    proveedor?: string
    asegurado?: string
    poliza?: string
    idSiniestro?: string
    numeroFactura?: string
    rucProveedor?: string
    placa?: string
    vehiculo?: string
    etiquetaSimulada?: string
  }
  explicacion: string
}

type ExtractedFields = FraudAnalysis['detalles']

const HIGH_RISK_KEYWORDS = [
  'urgente',
  'inmediato',
  'efectivo',
  'no declarado',
  'sin factura',
  'accidente total',
  'perdida total',
  'pérdida total',
  'robo total',
  'siniestro total',
  'incendio completo',
  'hurto',
  'asalto',
  'factura alterada',
  'documento adulterado',
  'falsificacion',
  'falsificación',
]

const MEDIUM_RISK_KEYWORDS = [
  'daño parcial',
  'reparacion',
  'reparación',
  'taller',
  'clinica',
  'clínica',
  'hospital',
  'factura',
  'recibo',
  'comprobante',
  'poliza nueva',
  'póliza nueva',
  'recien asegurado',
  'recién asegurado',
]

const PROVEEDORES_RESTRICTIVOS = [
  'taller mecanico express',
  'taller mecánico express',
  'clinica rapida',
  'clínica rápida',
  'reparaciones xyz',
  'servicios medicos del sur',
  'servicios médicos del sur',
  'autopartes economicas',
  'autopartes económicas',
  'taller hermanos',
]

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function cleanLine(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMoney(rawValue: string): number | null {
  const cleaned = rawValue
    .replace(/[$\s]/g, '')
    .replace(/[^\d.,]/g, '')

  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let normalized = cleaned

  if (lastComma !== -1 && lastDot !== -1) {
    // Ejemplo: 5,528.00 o 5.528,00
    if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, '')
    } else {
      normalized = cleaned.replace(/\./g, '').replace(',', '.')
    }
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1

    if (decimals === 2) {
      normalized = cleaned.replace(',', '.')
    } else {
      normalized = cleaned.replace(/,/g, '')
    }
  } else if (lastDot !== -1) {
    const decimals = cleaned.length - lastDot - 1

    if (decimals !== 2) {
      normalized = cleaned.replace(/\./g, '')
    }
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function extractFirstMatch(content: string, regex: RegExp): string | undefined {
  const match = content.match(regex)
  return match?.[1] ? cleanLine(match[1]) : undefined
}

function extractProvider(content: string): string | undefined {
  const lines = content
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)

  const ignoredWords = [
    'factura',
    'subtotal',
    'iva',
    'total',
    'cliente',
    'placa',
    'vehiculo',
    'vehículo',
    'cant.',
    'descripcion',
    'descripción',
    'caso:',
  ]

  const explicitBeforeRuc = content.match(/^(.+?)\s+Servicios.*?RUC:/is)

  if (explicitBeforeRuc?.[1]) {
    const provider = cleanLine(explicitBeforeRuc[1].split('\n')[0])
    if (provider.length > 3) return provider
  }

  const rucIndex = lines.findIndex(line => /^RUC[:\s]/i.test(line))

  if (rucIndex > 0) {
    const previous = lines[rucIndex - 1]

    if (
      previous &&
      previous.length > 3 &&
      !ignoredWords.some(word => normalizeText(previous).includes(normalizeText(word)))
    ) {
      return previous
    }
  }

  const possibleProvider = lines.find(line => {
    const normalized = normalizeText(line)

    const looksLikeProvider =
      line === line.toUpperCase() &&
      line.length >= 6 &&
      /[A-ZÁÉÍÓÚÑ]/.test(line)

    const isIgnored = ignoredWords.some(word => normalized.includes(normalizeText(word)))

    return looksLikeProvider && !isIgnored
  })

  return possibleProvider
}

function extractMontoTotal(content: string): number | undefined {
  const totalPatterns = [
    /TOTAL\s+A\s+PAGAR\s*\$?\s*([0-9.,]+)/i,
    /TOTAL\s+PAGAR\s*\$?\s*([0-9.,]+)/i,
    /TOTAL\s*\$?\s*([0-9.,]+)/i,
    /Monto\s*(?:reclamado|total)?\s*[:\s]*\$?\s*([0-9.,]+)/i,
  ]

  for (const pattern of totalPatterns) {
    const match = content.match(pattern)

    if (match?.[1]) {
      const parsed = parseMoney(match[1])

      if (parsed !== null) {
        return parsed
      }
    }
  }

  const moneyMatches = Array.from(
    content.matchAll(/\$\s*([0-9]{1,3}(?:[.,]?[0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)/g)
  )

  const amounts = moneyMatches
    .map(match => parseMoney(match[1]))
    .filter((value): value is number => value !== null)

  if (amounts.length === 0) {
    return undefined
  }

  return Math.max(...amounts)
}

function extractFields(content: string): ExtractedFields {
  const idSiniestroRaw =
    extractFirstMatch(content, /Siniestro\s*(?:Ref\.?|Referencia)?\s*[:#-]?\s*(SIN[-\s]?\d+)/i) ||
    extractFirstMatch(content, /\b(SIN[-\s]?\d{3,})\b/i)

  const idSiniestro = idSiniestroRaw
    ? idSiniestroRaw.replace(/\s+/g, '').toUpperCase()
    : undefined

  const numeroFactura = extractFirstMatch(
    content,
    /(?:N[º°o]\s*[:#-]?\s*)([0-9]{3}-[0-9]{3}-[0-9]+)/i
  )

  const rucProveedor = extractFirstMatch(
    content,
    /RUC\s*[:#]?\s*([0-9]{10,13})/i
  )

  const fechaEvento =
    extractFirstMatch(content, /Fecha\s*[:#]?\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2})/i) ||
    extractFirstMatch(content, /Fecha\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)

  const asegurado = extractFirstMatch(
    content,
    /Cliente\s*[:#]?\s*(.+?)(?:\s+Placa\s*:|\n|$)/i
  )

  const placa = extractFirstMatch(
    content,
    /Placa\s*[:#]?\s*([A-Z0-9-]+)/i
  )

  const vehiculo = extractFirstMatch(
    content,
    /Veh[ií]culo\s*[:#]?\s*(.+?)(?:\n|$)/i
  )

  const poliza = extractFirstMatch(
    content,
    /P[oó]liza\s*[:#]?\s*([A-Z0-9-]+)/i
  )

  const etiquetaSimulada = extractFirstMatch(
    content,
    /Caso\s*[:#]?\s*(Leg[ií]timo|Sospechoso|Fraude|No fraude)/i
  )

  const proveedor = extractProvider(content)
  const montoDetectado = extractMontoTotal(content)

  return {
    idSiniestro,
    numeroFactura,
    rucProveedor,
    fechaEvento,
    asegurado,
    placa,
    vehiculo,
    poliza,
    proveedor,
    montoDetectado,
    etiquetaSimulada,
  }
}

function calculateRiskScore(content: string, fileName: string, detalles: ExtractedFields) {
  const normalizedContent = normalizeText(content)
  const normalizedFileName = normalizeText(fileName)
  const alertas: string[] = []

  let score = 25

  const highRiskMatches = HIGH_RISK_KEYWORDS.filter(keyword =>
    normalizedContent.includes(normalizeText(keyword))
  )

  highRiskMatches.forEach(keyword => {
    score += 14
    alertas.push(`Término sensible detectado: "${keyword}"`)
  })

  const mediumMatches = MEDIUM_RISK_KEYWORDS.filter(keyword =>
    normalizedContent.includes(normalizeText(keyword))
  )

  score += Math.min(mediumMatches.length * 2, 10)

  if (
    normalizedFileName.includes('factura') ||
    normalizedContent.includes('factura')
  ) {
    score += 2
  }

  if (detalles.montoDetectado !== undefined) {
    if (detalles.montoDetectado >= 50000) {
      score += 25
      alertas.push(`Monto elevado detectado: ${formatMoney(detalles.montoDetectado)}`)
    } else if (detalles.montoDetectado >= 20000) {
      score += 14
      alertas.push(`Monto considerable detectado: ${formatMoney(detalles.montoDetectado)}`)
    } else if (detalles.montoDetectado >= 10000) {
      score += 6
      alertas.push(`Monto moderadamente alto detectado: ${formatMoney(detalles.montoDetectado)}`)
    }
  }

  PROVEEDORES_RESTRICTIVOS.forEach(proveedor => {
    if (normalizedContent.includes(normalizeText(proveedor))) {
      score += 28
      alertas.push(`Proveedor en lista restrictiva: ${proveedor}`)
      detalles.proveedor = proveedor
    }
  })

  if (detalles.idSiniestro) {
    score += 1
  }

  if (detalles.numeroFactura) {
    score += 1
  }

  if (!detalles.montoDetectado && normalizedFileName.includes('factura')) {
    score += 6
    alertas.push('No se pudo identificar el monto total de la factura')
  }

  if (!detalles.fechaEvento && normalizedFileName.includes('factura')) {
    score += 4
    alertas.push('No se pudo identificar la fecha del documento')
  }

  if (alertas.length >= 4) {
    score += 8
    alertas.push('Múltiples indicadores de revisión detectados')
  }

  const finalScore = Math.max(0, Math.min(Math.round(score), 100))

  return {
    score: finalScore,
    alertas,
  }
}

function getRiskLevel(score: number): FraudAnalysis['nivelRiesgo'] {
  if (score >= 76) return 'ROJO'
  if (score >= 41) return 'AMARILLO'
  return 'VERDE'
}

function generarRecomendaciones(
  nivelRiesgo: FraudAnalysis['nivelRiesgo'],
  detalles: ExtractedFields
): string[] {
  if (nivelRiesgo === 'ROJO') {
    const recomendaciones = [
      'Priorizar para revisión humana especializada.',
      'Validar documentación original y consistencia de montos.',
      'Cruzar información del siniestro con historial de reclamos.',
    ]

    if (detalles.proveedor) {
      recomendaciones.push(`Revisar historial asociado al proveedor: ${detalles.proveedor}.`)
    }

    return recomendaciones
  }

  if (nivelRiesgo === 'AMARILLO') {
    return [
      'Solicitar o validar documentación adicional.',
      'Realizar revisión documental por la Unidad Antifraude.',
      'Verificar consistencia entre monto, fecha, proveedor y siniestro asociado.',
    ]
  }

  return [
    'Procesar según flujo normal de trámite.',
    'Mantener monitoreo de rutina.',
  ]
}

function generarExplicacion(
  alertas: string[],
  nivelRiesgo: FraudAnalysis['nivelRiesgo'],
  score: number,
  detalles: ExtractedFields
): string {
  let explicacion = `El documento fue clasificado con nivel ${nivelRiesgo} y score ${score}/100.\n\n`

  if (detalles.idSiniestro) {
    explicacion += `Siniestro identificado: ${detalles.idSiniestro}\n`
  }

  if (detalles.numeroFactura) {
    explicacion += `Factura identificada: ${detalles.numeroFactura}\n`
  }

  if (detalles.proveedor) {
    explicacion += `Proveedor identificado: ${detalles.proveedor}\n`
  }

  if (detalles.rucProveedor) {
    explicacion += `RUC proveedor: ${detalles.rucProveedor}\n`
  }

  if (detalles.asegurado) {
    explicacion += `Cliente/Asegurado: ${detalles.asegurado}\n`
  }

  if (detalles.placa) {
    explicacion += `Placa: ${detalles.placa}\n`
  }

  if (detalles.vehiculo) {
    explicacion += `Vehículo: ${detalles.vehiculo}\n`
  }

  if (detalles.montoDetectado !== undefined) {
    explicacion += `Monto identificado: ${formatMoney(detalles.montoDetectado)}\n`
  }

  if (detalles.fechaEvento) {
    explicacion += `Fecha identificada: ${detalles.fechaEvento}\n`
  }

  if (detalles.etiquetaSimulada) {
    explicacion += `Etiqueta simulada del documento: ${detalles.etiquetaSimulada}. Esta etiqueta se registra solo como referencia del dataset sintético y no debe reemplazar la revisión humana.\n`
  }

  if (alertas.length > 0) {
    explicacion += `\nHallazgos principales:\n`

    alertas.slice(0, 5).forEach(alerta => {
      explicacion += `- ${alerta}\n`
    })
  } else {
    explicacion += `\nNo se identificaron alertas significativas con las reglas actuales del prototipo.\n`
  }

  explicacion += `\nNota importante: este análisis genera alertas de revisión, no acusaciones de fraude. Toda decisión requiere validación humana.`

  return explicacion
}

export function analyzeDocument(content: string, fileName: string): FraudAnalysis {
  const detalles = extractFields(content)
  const riskResult = calculateRiskScore(content, fileName, detalles)
  const nivelRiesgo = getRiskLevel(riskResult.score)

  const alertas = riskResult.alertas.length > 0
    ? riskResult.alertas
    : ['Sin alertas significativas detectadas']

  const recomendaciones = generarRecomendaciones(nivelRiesgo, detalles)

  const explicacion = generarExplicacion(
    riskResult.alertas,
    nivelRiesgo,
    riskResult.score,
    detalles
  )

  return {
    scoreFinal: riskResult.score,
    nivelRiesgo,
    alertas,
    recomendaciones,
    detalles,
    explicacion,
  }
}

// Esta función se conserva por compatibilidad con otros componentes.
// El chat principal ya usa /api/chat con Groq.
export function generateAIResponse(userMessage: string): string {
  const messageLower = normalizeText(userMessage)

  if (
    messageLower.includes('documento') ||
    messageLower.includes('factura') ||
    messageLower.includes('subir')
  ) {
    return `Puedes subir facturas, pólizas o reportes de siniestros. El sistema extrae campos clave, calcula un score de riesgo y genera alertas explicables para revisión humana.`
  }

  return `Puedo ayudarte a revisar casos, explicar alertas, analizar documentos subidos y priorizar siniestros que requieren revisión humana. Este sistema genera alertas de revisión, no acusaciones de fraude.`
}