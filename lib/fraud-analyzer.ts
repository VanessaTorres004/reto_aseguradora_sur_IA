// Analizador de fraude simulado para hackathon
// En produccion, esto se conectaria a un modelo ML real

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
  }
  explicacion: string
}

// Palabras clave que indican posible fraude
const ALERTAS_KEYWORDS = {
  alta: [
    'urgente', 'inmediato', 'efectivo', 'no declarado', 'sin factura',
    'accidente total', 'perdida total', 'robo total', 'siniestro total',
    'incendio completo', 'hurto', 'asalto'
  ],
  media: [
    'daño parcial', 'reparacion', 'taller', 'clinica', 'hospital',
    'factura', 'recibo', 'comprobante', 'poliza nueva', 'recien asegurado'
  ],
  patrones: [
    { regex: /monto[:\s]*\$?\s*(\d{1,3}(?:[,.]?\d{3})*(?:[,.]\d{2})?)/gi, alert: 'Monto detectado en documento' },
    { regex: /poliza[:\s#]*([A-Z0-9-]+)/gi, alert: 'Numero de poliza identificado' },
    { regex: /fecha[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, alert: 'Fecha de evento detectada' },
    { regex: /(doctor|dr\.?|dra\.?|lic\.?|ing\.?)\s+([a-záéíóúñ\s]+)/gi, alert: 'Proveedor/profesional identificado' },
  ]
}

// Proveedores ficticios en lista restrictiva
const PROVEEDORES_RESTRICTIVOS = [
  'taller mecanico express', 'clinica rapida', 'reparaciones xyz',
  'servicios medicos del sur', 'autopartes economicas', 'taller hermanos'
]

export function analyzeDocument(content: string, fileName: string): FraudAnalysis {
  const contentLower = content.toLowerCase()
  const alertas: string[] = []
  let score = 30 // Score base
  
  // Analizar palabras clave de alta prioridad
  ALERTAS_KEYWORDS.alta.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      score += 15
      alertas.push(`Termino de alto riesgo detectado: "${keyword}"`)
    }
  })
  
  // Analizar palabras clave de prioridad media
  ALERTAS_KEYWORDS.media.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      score += 5
    }
  })
  
  // Analizar patrones
  const detalles: FraudAnalysis['detalles'] = {}
  
  ALERTAS_KEYWORDS.patrones.forEach(pattern => {
    const matches = contentLower.match(pattern.regex)
    if (matches) {
      alertas.push(pattern.alert)
      score += 8
    }
  })
  
  // Detectar montos
  const montoMatch = content.match(/\$\s*(\d{1,3}(?:[,.]?\d{3})*(?:[,.]\d{2})?)/g)
  if (montoMatch) {
    const montos = montoMatch.map(m => parseFloat(m.replace(/[$,]/g, '').replace('.', '')))
    const maxMonto = Math.max(...montos)
    detalles.montoDetectado = maxMonto
    
    if (maxMonto > 50000) {
      score += 20
      alertas.push(`Monto elevado detectado: $${maxMonto.toLocaleString()}`)
    } else if (maxMonto > 20000) {
      score += 10
      alertas.push(`Monto considerable: $${maxMonto.toLocaleString()}`)
    }
  }
  
  // Detectar proveedores en lista restrictiva
  PROVEEDORES_RESTRICTIVOS.forEach(proveedor => {
    if (contentLower.includes(proveedor)) {
      score += 25
      alertas.push(`Proveedor en lista restrictiva: ${proveedor}`)
      detalles.proveedor = proveedor
    }
  })
  
  // Detectar fechas cercanas (posible siniestro al borde de vigencia)
  const fechaMatch = content.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g)
  if (fechaMatch) {
    detalles.fechaEvento = fechaMatch[0]
  }
  
  // Detectar numeros de poliza
  const polizaMatch = content.match(/poliza[:\s#]*([A-Z0-9-]+)/i)
  if (polizaMatch) {
    detalles.poliza = polizaMatch[1]
  }
  
  // Ajustar score si hay muchas alertas
  if (alertas.length > 5) {
    score += 15
    alertas.push('Multiples indicadores de riesgo detectados')
  }
  
  // Limitar score a 100
  score = Math.min(score, 100)
  
  // Determinar nivel de riesgo
  let nivelRiesgo: 'ROJO' | 'AMARILLO' | 'VERDE'
  if (score >= 76) {
    nivelRiesgo = 'ROJO'
  } else if (score >= 41) {
    nivelRiesgo = 'AMARILLO'
  } else {
    nivelRiesgo = 'VERDE'
  }
  
  // Generar recomendaciones basadas en el analisis
  const recomendaciones: string[] = []
  
  if (nivelRiesgo === 'ROJO') {
    recomendaciones.push('Asignar caso a revision especializada de campo')
    recomendaciones.push('Verificar documentacion original con el asegurado')
    recomendaciones.push('Cruzar informacion con base de datos de fraudes conocidos')
    if (detalles.proveedor) {
      recomendaciones.push(`Investigar historial del proveedor: ${detalles.proveedor}`)
    }
  } else if (nivelRiesgo === 'AMARILLO') {
    recomendaciones.push('Solicitar documentacion adicional')
    recomendaciones.push('Revision documental por Unidad Antifraude')
    recomendaciones.push('Verificar consistencia de montos y fechas')
  } else {
    recomendaciones.push('Procesar segun flujo normal de tramite')
    recomendaciones.push('Mantener en monitoreo de rutina')
  }
  
  // Generar explicacion
  const explicacion = generarExplicacion(alertas, nivelRiesgo, score, detalles)
  
  return {
    scoreFinal: score,
    nivelRiesgo,
    alertas: alertas.length > 0 ? alertas : ['Sin alertas significativas detectadas'],
    recomendaciones,
    detalles,
    explicacion
  }
}

function generarExplicacion(
  alertas: string[],
  nivelRiesgo: string,
  score: number,
  detalles: FraudAnalysis['detalles']
): string {
  let explicacion = `El documento ha sido analizado y clasificado con nivel de riesgo ${nivelRiesgo} (Score: ${score}/100).\n\n`
  
  if (alertas.length > 0) {
    explicacion += `**Hallazgos principales:**\n`
    alertas.slice(0, 5).forEach(alerta => {
      explicacion += `- ${alerta}\n`
    })
    explicacion += '\n'
  }
  
  if (detalles.montoDetectado) {
    explicacion += `**Monto identificado:** $${detalles.montoDetectado.toLocaleString()}\n`
  }
  
  if (detalles.fechaEvento) {
    explicacion += `**Fecha del evento:** ${detalles.fechaEvento}\n`
  }
  
  if (detalles.proveedor) {
    explicacion += `**Proveedor involucrado:** ${detalles.proveedor} (EN LISTA RESTRICTIVA)\n`
  }
  
  explicacion += `\n**Nota importante:** Este analisis genera alertas de revision, NO acusaciones de fraude. Se recomienda la revision humana para la decision final.`
  
  return explicacion
}

// Respuestas simuladas del agente IA
export function generateAIResponse(userMessage: string): string {
  const messageLower = userMessage.toLowerCase()
  
  // Respuestas predefinidas basadas en patrones
  if (messageLower.includes('10 siniestros') || messageLower.includes('mayor riesgo')) {
    return `## Top 10 Siniestros con Mayor Riesgo de Posible Irregularidad

Basado en el analisis del dataset de 500 siniestros, estos son los casos que requieren atencion prioritaria:

| # | ID Siniestro | Score | Nivel | Ramo | Monto | Alertas Principales |
|---|--------------|-------|-------|------|-------|---------------------|
| 1 | SIN-2024-0342 | 94 | ROJO | Vehiculos | $45,200 | Proveedor en lista restrictiva, Monto atipico |
| 2 | SIN-2024-0156 | 91 | ROJO | Salud | $38,750 | Frecuencia alta de reclamos, Documentacion incompleta |
| 3 | SIN-2024-0089 | 88 | ROJO | Hogar | $52,100 | Siniestro al borde de vigencia, Monto elevado |
| 4 | SIN-2024-0267 | 85 | ROJO | Vehiculos | $31,400 | Narrativa similar a casos previos, Reporte tardio |
| 5 | SIN-2024-0198 | 83 | ROJO | Salud | $28,900 | Proveedor con multiples alertas, Patron sospechoso |
| 6 | SIN-2024-0445 | 81 | ROJO | Vehiculos | $41,600 | Inconsistencia documental, Testigos no verificables |
| 7 | SIN-2024-0312 | 79 | ROJO | Hogar | $35,200 | Asegurado con historial de reclamos |
| 8 | SIN-2024-0078 | 78 | ROJO | Vida | $65,000 | Beneficiario recien agregado, Poliza nueva |
| 9 | SIN-2024-0234 | 77 | ROJO | Vehiculos | $22,800 | Taller en lista restrictiva |
| 10 | SIN-2024-0401 | 76 | ROJO | Salud | $19,500 | Multiples facturas del mismo proveedor |

**Recomendacion:** Estos 10 casos deben ser asignados inmediatamente a revision especializada de campo. Se sugiere priorizar los casos 1, 2 y 3 por su combinacion de alto score y monto significativo.

*Nota: Este analisis genera alertas de revision, no acusaciones de fraude.*`
  }
  
  if (messageLower.includes('proveedor') && (messageLower.includes('alerta') || messageLower.includes('rojo'))) {
    return `## Proveedores con Mayor Concentracion de Alertas

Del analisis de la red de proveedores, estos son los que concentran mas casos de alto riesgo:

### Proveedores en Lista Restrictiva con Casos Activos:

1. **Taller Mecanico El Rapido** (Guayaquil)
   - Casos asociados: 12
   - Casos ROJO: 8 (67%)
   - Motivo de inclusion: Facturacion irregular detectada en auditoria 2023

2. **Clinica Medical Express** (Quito)
   - Casos asociados: 9
   - Casos ROJO: 6 (67%)
   - Motivo: Sobrefacturacion sistematica detectada

3. **Autopartes del Pacifico** (Manta)
   - Casos asociados: 7
   - Casos ROJO: 5 (71%)
   - Motivo: Vinculo con red de fraude desarticulada

4. **Centro Medico Familiar** (Cuenca)
   - Casos asociados: 6
   - Casos ROJO: 4 (67%)
   - Motivo: Inconsistencias en diagnosticos

5. **Taller Hermanos Mendoza** (Guayaquil)
   - Casos asociados: 5
   - Casos ROJO: 4 (80%)
   - Motivo: Facturas duplicadas en multiples siniestros

**Accion recomendada:** Cualquier siniestro que involucre estos proveedores debe pasar automaticamente a revision de la Unidad Antifraude antes de su tramite.`
  }
  
  if (messageLower.includes('ramo') && (messageLower.includes('sospechoso') || messageLower.includes('porcentaje'))) {
    return `## Distribucion de Casos Sospechosos por Ramo

Analisis de la concentracion de alertas por linea de negocio:

| Ramo | Total Casos | ROJO | AMARILLO | VERDE | % Alto Riesgo |
|------|-------------|------|----------|-------|---------------|
| Vehiculos | 180 | 25 | 45 | 110 | 13.9% |
| Salud | 150 | 18 | 38 | 94 | 12.0% |
| Hogar | 90 | 8 | 22 | 60 | 8.9% |
| Vida | 50 | 4 | 12 | 34 | 8.0% |
| Otros | 30 | 2 | 6 | 22 | 6.7% |

### Observaciones Clave:

1. **Vehiculos** presenta la mayor tasa de casos ROJO (13.9%), concentrados principalmente en:
   - Robo total de vehiculos recien asegurados
   - Reparaciones con talleres no autorizados
   - Facturas con montos atipicos

2. **Salud** muestra patrones preocupantes en:
   - Procedimientos electivos facturados como urgentes
   - Clinicas con alta frecuencia de casos

3. **Hogar** tiene casos puntuales pero de alto monto en:
   - Robos con poca evidencia documental
   - Incendios con polizas nuevas

**Recomendacion:** Reforzar controles preventivos en Vehiculos y Salud, que concentran el 75% de los casos de alto riesgo.`
  }
  
  if (messageLower.includes('sucursal') && messageLower.includes('alerta')) {
    return `## Concentracion de Alertas por Sucursal

Distribucion geografica de casos de alto riesgo:

| Sucursal | Total Casos | ROJO | % del Total |
|----------|-------------|------|-------------|
| Guayaquil Centro | 85 | 15 | 17.6% |
| Quito Norte | 72 | 11 | 15.3% |
| Guayaquil Norte | 68 | 9 | 13.2% |
| Cuenca | 55 | 7 | 12.7% |
| Manta | 48 | 6 | 12.5% |
| Quito Sur | 45 | 5 | 11.1% |
| Ambato | 42 | 3 | 7.1% |
| Loja | 35 | 2 | 5.7% |
| Machala | 30 | 2 | 6.7% |
| Portoviejo | 20 | 0 | 0% |

### Analisis:

- **Guayaquil Centro** lidera en casos de alto riesgo, principalmente por:
  - Mayor volumen de polizas de vehiculos
  - Concentracion de proveedores en lista restrictiva
  - Red de talleres con alertas previas

- **Quito Norte** muestra patron similar en ramo de Salud

**Accion sugerida:** Implementar controles reforzados en Guayaquil Centro y Quito Norte, con revision obligatoria de casos que superen $20,000.`
  }
  
  if (messageLower.includes('resumen') || messageLower.includes('ejecutivo')) {
    return `## Resumen Ejecutivo - Sistema de Deteccion de Fraude

### Estado General del Analisis

- **Periodo analizado:** Ultimos 12 meses
- **Total de siniestros evaluados:** 500
- **Monto total en revision:** $12,450,000

### Distribucion por Nivel de Riesgo

| Nivel | Cantidad | % Total | Monto Asociado |
|-------|----------|---------|----------------|
| ROJO | 57 | 11.4% | $2,890,000 |
| AMARILLO | 123 | 24.6% | $4,120,000 |
| VERDE | 320 | 64.0% | $5,440,000 |

### Indicadores Clave

- **Score promedio del dataset:** 42/100
- **Proveedores en lista restrictiva activos:** 12
- **Casos con multiples alertas (>3):** 89

### Alertas Mas Frecuentes

1. Monto atipico respecto a suma asegurada (78 casos)
2. Proveedor en lista restrictiva (45 casos)
3. Documentacion incompleta (42 casos)
4. Siniestro al borde de vigencia (38 casos)
5. Alta frecuencia de reclamos por asegurado (31 casos)

### Acciones Recomendadas

1. **Inmediatas:** Asignar los 57 casos ROJO a revision de campo
2. **Corto plazo:** Revisar documentalmente los 123 casos AMARILLO
3. **Preventivas:** Reforzar controles en sucursales de Guayaquil y Quito

### Impacto Estimado

Si se confirman las irregularidades detectadas, el ahorro potencial para la aseguradora seria de aproximadamente **$1,500,000 - $2,000,000** en siniestros que no deberian ser pagados o requieren ajuste.

*Este reporte fue generado automaticamente. Todas las alertas requieren validacion humana antes de tomar decisiones.*`
  }
  
  if (messageLower.includes('patron') || messageLower.includes('repiten')) {
    return `## Patrones Recurrentes en Casos Sospechosos

El analisis de patrones ha identificado las siguientes tendencias:

### 1. Patron de Tiempo (34 casos)
- Siniestros reportados en los primeros 30 dias de vigencia de poliza
- O en los ultimos 15 dias antes del vencimiento
- **Alerta:** Posible conocimiento previo del siniestro

### 2. Patron de Proveedor (45 casos)
- Concentracion de reclamos en proveedores especificos
- Facturas con formatos y montos similares
- **Alerta:** Posible colusion asegurado-proveedor

### 3. Patron de Frecuencia (31 casos)
- Asegurados con 3+ reclamos en 12 meses
- Reclamos en diferentes ramos pero similar patron
- **Alerta:** Posible perfil de alto riesgo

### 4. Patron de Narrativa (28 casos)
- Descripciones de siniestros con redaccion similar
- Detalles especificos que se repiten entre casos
- **Alerta:** Posible clonacion de reclamos o guion compartido

### 5. Patron de Monto (22 casos)
- Reclamos justo por debajo de umbrales de aprobacion automatica
- Incrementos progresivos en reclamos sucesivos
- **Alerta:** Conocimiento de procesos internos

### Recomendaciones:
- Implementar reglas automaticas para detectar estos patrones en tiempo real
- Cruzar bases de datos entre ramos para identificar asegurados multi-reclamo
- Entrenar al personal de primera linea en reconocimiento de narrativas sospechosas`
  }
  
  if (messageLower.includes('revisar primero') || messageLower.includes('priorizar')) {
    return `## Casos Prioritarios para Revision Inmediata

Basado en la combinacion de score de riesgo, monto y tipo de alertas, recomiendo revisar estos casos en orden de prioridad:

### Prioridad CRITICA (Revisar hoy)

1. **SIN-2024-0342** - Score 94
   - Monto: $45,200 (Vehiculos)
   - Proveedor en lista restrictiva + Monto atipico
   - Accion: Verificacion de campo urgente

2. **SIN-2024-0089** - Score 88
   - Monto: $52,100 (Hogar)
   - Siniestro al borde de vigencia + Monto elevado
   - Accion: Revision de poliza y documentos originales

3. **SIN-2024-0078** - Score 78
   - Monto: $65,000 (Vida)
   - Beneficiario recien agregado + Poliza nueva
   - Accion: Verificacion de identidad y entrevista

### Prioridad ALTA (Esta semana)

4-7. Casos con score 75-85 y montos >$25,000

### Prioridad MEDIA (Proximos 15 dias)

8-15. Casos ROJO restantes por orden de score

### Flujo Sugerido

1. Asignar casos criticos a investigadores senior
2. Solicitar documentacion adicional antes de contacto
3. Coordinar con Unidad Legal si se confirman irregularidades
4. Documentar hallazgos en sistema para alimentar modelo ML

**Tiempo estimado de revision:** 3-5 dias para casos criticos si se asignan recursos dedicados.`
  }
  
  if (messageLower.includes('metodologia') || messageLower.includes('scoring')) {
    return `## Metodologia de Scoring del Sistema de Deteccion

### Modelo Hibrido de Evaluacion

El sistema utiliza un enfoque combinado que integra multiples tecnicas:

#### Componentes del Score (Total: 100 puntos)

| Componente | Peso | Descripcion |
|------------|------|-------------|
| Reglas de Negocio | 40% | Validaciones basadas en experiencia de la aseguradora |
| Random Forest | 35% | Modelo supervisado entrenado con casos historicos confirmados |
| Isolation Forest | 15% | Deteccion de anomalias no supervisada |
| Analisis NLP | 10% | Procesamiento de narrativas y descripciones |

### Clasificacion por Nivel de Riesgo

| Rango | Nivel | Accion |
|-------|-------|--------|
| 0-40 | VERDE | Flujo normal de tramite |
| 41-75 | AMARILLO | Revision documental por Unidad Antifraude |
| 76-100 | ROJO | Revision especializada de campo |

### Reglas de Negocio Principales

1. **Temporalidad** (+15 pts)
   - Siniestro en primeros 30 dias de poliza
   - Siniestro en ultimos 15 dias de vigencia

2. **Proveedor** (+20 pts)
   - En lista restrictiva
   - Multiples casos con mismo proveedor

3. **Frecuencia** (+15 pts)
   - 3+ reclamos en 12 meses
   - Reclamos en multiples ramos

4. **Monto** (+10-25 pts)
   - Atipico vs suma asegurada
   - Cerca de umbral de aprobacion automatica

5. **Documentacion** (+10 pts)
   - Incompleta o inconsistente
   - Formatos no estandar

### Mejora Continua

El modelo se reentrena trimestralmente con los casos confirmados como fraude o falsos positivos, mejorando continuamente su precision.

**Precision actual del modelo:** 87% en deteccion de casos confirmados`
  }
  
  // Respuesta generica si no coincide con ningun patron
  return `Gracias por tu consulta. Basado en el analisis del dataset de 500 siniestros, puedo proporcionarte informacion sobre:

- **Casos de alto riesgo:** 57 siniestros clasificados como ROJO requieren revision inmediata
- **Proveedores:** 12 proveedores en lista restrictiva con casos activos
- **Patrones detectados:** Alertas por temporalidad, monto atipico y frecuencia de reclamos

Para un analisis mas especifico, puedes preguntarme sobre:
- Los 10 siniestros con mayor riesgo
- Proveedores con mas alertas
- Distribucion por ramo o sucursal
- Patrones recurrentes de fraude
- Metodologia de scoring

Tambien puedes **subir documentos** (facturas, reportes, polizas) para que los analice en busca de posibles irregularidades.

*Recuerda: Este sistema genera alertas de revision, no acusaciones. La decision final siempre debe ser humana.*`
}
