'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  FileText,
  Search,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { siniestros, proveedores, asegurados } from '@/lib/data'
import type { Siniestro } from '@/lib/data'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  caseRef?: string
}

interface NLPResult {
  score: number
  nivel: 'ROJO' | 'AMARILLO' | 'VERDE'
  palabrasClave: { word: string; weight: 'alta' | 'media' | 'baja' }[]
  entidades: { tipo: string; valor: string }[]
  resumen: string
  alertas: string[]
}

// Palabras clave y su peso para análisis NLP
const KEYWORDS: Record<string, { weight: 'alta' | 'media' | 'baja'; score: number }> = {
  'urgente': { weight: 'alta', score: 18 },
  'inmediato': { weight: 'alta', score: 15 },
  'efectivo': { weight: 'alta', score: 20 },
  'sin recibo': { weight: 'alta', score: 22 },
  'robo total': { weight: 'alta', score: 15 },
  'pérdida total': { weight: 'alta', score: 12 },
  'accidente total': { weight: 'alta', score: 12 },
  'incendio completo': { weight: 'alta', score: 14 },
  'hurto': { weight: 'alta', score: 10 },
  'asalto': { weight: 'alta', score: 12 },
  'no tengo testigos': { weight: 'alta', score: 16 },
  'factura': { weight: 'media', score: 5 },
  'taller': { weight: 'media', score: 4 },
  'clinica': { weight: 'media', score: 4 },
  'hospital': { weight: 'media', score: 3 },
  'reparacion': { weight: 'media', score: 4 },
  'daño parcial': { weight: 'baja', score: 2 },
  'colision': { weight: 'baja', score: 3 },
  'golpe': { weight: 'baja', score: 2 },
}

function analyzeText(text: string): NLPResult {
  const lower = text.toLowerCase()
  let score = 20
  const palabrasClave: NLPResult['palabrasClave'] = []
  const alertas: string[] = []
  const entidades: NLPResult['entidades'] = []

  // Detectar palabras clave
  Object.entries(KEYWORDS).forEach(([word, config]) => {
    if (lower.includes(word)) {
      score += config.score
      palabrasClave.push({ word, weight: config.weight })
      if (config.weight === 'alta') {
        alertas.push(`Termino de riesgo alto detectado: "${word}"`)
      }
    }
  })

  // Detectar montos
  const montoMatches = text.match(/\$\s?[\d.,]+|\d+[\.,]\d{3}/g)
  if (montoMatches) {
    const valores = montoMatches.map(m => parseFloat(m.replace(/[$,.]/g, '')))
    const maxVal = Math.max(...valores)
    entidades.push({ tipo: 'Monto', valor: `$${maxVal.toLocaleString()}` })
    if (maxVal > 50000) { score += 20; alertas.push('Monto muy elevado detectado') }
    else if (maxVal > 20000) { score += 10; alertas.push('Monto considerable detectado') }
  }

  // Detectar fechas
  const fechaMatches = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g)
  if (fechaMatches) {
    entidades.push({ tipo: 'Fecha', valor: fechaMatches[0] })
  }

  // Detectar números de póliza/siniestro
  const polizaMatch = text.match(/[A-Z]{2,4}[-\s]?\d{4,8}/g)
  if (polizaMatch) {
    entidades.push({ tipo: 'Referencia', valor: polizaMatch[0] })
  }

  // Detectar nombres propios (mayúsculas seguidas)
  const nombreMatch = text.match(/[A-Z][a-záéíóú]+ [A-Z][a-záéíóú]+/g)
  if (nombreMatch) {
    entidades.push({ tipo: 'Nombre', valor: nombreMatch[0] })
  }

  score = Math.min(score, 100)
  const nivel: NLPResult['nivel'] = score >= 76 ? 'ROJO' : score >= 41 ? 'AMARILLO' : 'VERDE'

  const resumen = `Texto analizado: ${text.length} caracteres. Se detectaron ${palabrasClave.length} palabras clave y ${entidades.length} entidades. ` +
    (alertas.length > 0 ? `Principales alertas: ${alertas.slice(0, 2).join('; ')}.` : 'Sin alertas críticas detectadas.')

  return { score, nivel, palabrasClave, entidades, resumen, alertas }
}

function generateCaseResponse(query: string, caseId: string | null): string {
  const lower = query.toLowerCase()

  if (caseId) {
    const caso = siniestros.find(s => s.id === caseId)
    if (caso) {
      const asegurado = asegurados.find(a => a.id === caso.idAsegurado)
      const proveedor = proveedores.find(p => p.id === caso.idProveedor)

      if (lower.includes('resumen') || lower.includes('detalles') || lower.includes('información')) {
        return `## Resumen del Caso ${caso.id}

**Nivel de Riesgo:** ${caso.nivelRiesgo} — Score: ${caso.scoreFinal}/100
**Ramo / Cobertura:** ${caso.ramo} / ${caso.cobertura}
**Estado actual:** ${caso.estado}
**Sucursal:** ${caso.sucursal}

### Datos Financieros
- Monto reclamado: $${caso.montoReclamado.toLocaleString()}
- Monto estimado: $${caso.montoEstimado.toLocaleString()}
- Suma asegurada: $${caso.sumaAsegurada.toLocaleString()}
- Relación monto/estimado: ${((caso.montoReclamado / caso.montoEstimado) * 100).toFixed(1)}%

### Asegurado
- ID: ${asegurado?.id || caso.idAsegurado}
- Nombre: ${asegurado?.nombre || 'N/D'}
- Ciudad: ${asegurado?.ciudad || 'N/D'}
- Reclamos previos (18 meses): ${caso.reclamosPrevios}

### Proveedor
- Nombre: ${proveedor?.nombre || caso.idProveedor}
- Tipo: ${proveedor?.tipo || 'N/D'}
- En lista restrictiva: ${caso.proveedorListaRestrictiva ? 'SÍ' : 'No'}

### Alertas Detectadas
${caso.alertas.map(a => `- ${a}`).join('\n')}

*Recomendación: ${caso.nivelRiesgo === 'ROJO' ? 'Asignar a revisión especializada de campo de forma prioritaria.' : caso.nivelRiesgo === 'AMARILLO' ? 'Solicitar documentación adicional y revisión por Unidad Antifraude.' : 'Procesar con flujo normal, mantener en monitoreo.'  }*`
      }

      if (lower.includes('alerta') || lower.includes('riesgo')) {
        return `## Análisis de Riesgo — ${caso.id}

El caso tiene un score de **${caso.scoreFinal}/100** clasificado como **${caso.nivelRiesgo}**.

### Factores de Riesgo Detectados:
${caso.alertas.map((a, i) => `${i + 1}. ${a}`).join('\n')}

### Scores por Componente:
- Reglas de negocio: ${caso.scoreReglas}/100
- Modelo ML: ${caso.scoreML}/100
- Anomalía estadística: ${caso.scoreAnomalia}/100
- Análisis NLP: ${caso.scoreNLP}/100

${caso.proveedorListaRestrictiva ? `⚠ **Atención:** El proveedor **${proveedor?.nombre}** está en la lista restrictiva por: ${proveedor?.motivoLista || 'motivo registrado en sistema'}` : ''}`
      }

      if (lower.includes('proveedor')) {
        return `## Información del Proveedor — Caso ${caso.id}

**Proveedor:** ${proveedor?.nombre || caso.idProveedor}
**Tipo:** ${proveedor?.tipo || 'N/D'}
**Ciudad:** ${proveedor?.ciudad || 'N/D'}
**En lista restrictiva:** ${proveedor?.listaRestrictiva ? `Sí — ${proveedor.motivoLista}` : 'No'}
**Total servicios en el sistema:** ${proveedor?.totalServicios || 'N/D'}

${proveedor?.listaRestrictiva
  ? 'Este proveedor está marcado en la lista restrictiva. Cualquier siniestro asociado debe pasar revisión obligatoria de la Unidad Antifraude antes de continuar su trámite.'
  : 'El proveedor no presenta alertas en lista restrictiva, pero se recomienda verificar el historial de servicios si el monto es elevado.'}`
      }

      return `Sobre el caso **${caso.id}**: tiene score ${caso.scoreFinal}/100 (${caso.nivelRiesgo}), monto reclamado $${caso.montoReclamado.toLocaleString()}, ramo ${caso.ramo}. ¿Quieres que te detalle las alertas, los datos del asegurado, el proveedor, o un resumen completo?`
    }
  }

  // Respuesta genérica sin caso seleccionado
  if (lower.includes('mayor riesgo') || lower.includes('top')) {
    const top5 = siniestros.slice(0, 5)
    return `## Top 5 Casos con Mayor Riesgo\n\n${top5.map((s, i) =>
      `${i + 1}. **${s.id}** — Score: ${s.scoreFinal}/100 (${s.nivelRiesgo}) — $${s.montoReclamado.toLocaleString()} — ${s.ramo}`
    ).join('\n')}\n\nSelecciona un caso del selector para obtener un análisis detallado.`
  }

  return `Soy el asistente de análisis de casos. Puedo ayudarte con:\n\n- Detalles completos de un caso específico\n- Análisis de alertas y factores de riesgo\n- Información del asegurado y proveedor\n- Comparación de montos y patrones\n\nSelecciona un caso del selector arriba, o pregúntame sobre los casos con mayor riesgo.`
}

const SUGERENCIAS_CHAT = [
  'Dame el resumen completo del caso',
  'Cuáles son las alertas de riesgo?',
  'Información del proveedor involucrado',
  'Muéstrame los scores por componente',
]

export function CaseChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [nlpText, setNlpText] = useState('')
  const [nlpResult, setNlpResult] = useState<NLPResult | null>(null)
  const [isAnalyzingNlp, setIsAnalyzingNlp] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [searchCaseId, setSearchCaseId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const topCases = siniestros.slice(0, 50)

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
      caseRef: selectedCaseId || undefined,
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    await new Promise(r => setTimeout(r, 700 + Math.random() * 800))

    const response = generateCaseResponse(text, selectedCaseId || null)
    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMsg])
    setIsLoading(false)
  }, [inputValue, isLoading, selectedCaseId])

  const handleSuggestion = useCallback((q: string) => {
    if (isLoading) return
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
      caseRef: selectedCaseId || undefined,
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setTimeout(async () => {
      const response = generateCaseResponse(q, selectedCaseId || null)
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }])
      setIsLoading(false)
    }, 700 + Math.random() * 800)
  }, [isLoading, selectedCaseId])

  const handleAnalyzeNlp = () => {
    if (!nlpText.trim()) return
    setIsAnalyzingNlp(true)
    setTimeout(() => {
      setNlpResult(analyzeText(nlpText))
      setIsAnalyzingNlp(false)
    }, 1200)
  }

  const selectedCase = siniestros.find(s => s.id === selectedCaseId)

  const riskColor = (nivel: string) => {
    if (nivel === 'ROJO') return 'text-red-600 bg-red-50 border-red-200'
    if (nivel === 'AMARILLO') return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }

  const riskBadgeVariant = (nivel: string) => {
    if (nivel === 'ROJO') return 'destructive'
    if (nivel === 'AMARILLO') return 'secondary'
    return 'outline'
  }

  const filteredCases = searchCaseId
    ? siniestros.filter(s =>
        s.id.toLowerCase().includes(searchCaseId.toLowerCase()) ||
        s.ramo.toLowerCase().includes(searchCaseId.toLowerCase())
      ).slice(0, 20)
    : topCases

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col gap-4 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Chat con Casos
        </h1>
        <p className="text-muted-foreground text-sm">
          Consultas en lenguaje natural sobre casos individuales y análisis NLP de texto de reclamos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit shrink-0">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat por Caso
          </TabsTrigger>
          <TabsTrigger value="nlp" className="gap-2">
            <Brain className="w-4 h-4" />
            Análisis de Texto (NLP)
          </TabsTrigger>
        </TabsList>

        {/* CHAT TAB */}
        <TabsContent value="chat" className="flex-1 flex gap-4 mt-4 min-h-0">
          {/* Case Selector Panel */}
          <Card className="w-72 shrink-0 flex flex-col overflow-hidden">
            <CardHeader className="py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Search className="w-4 h-4" />
                Seleccionar Caso
              </div>
              <Input
                placeholder="Buscar por ID o ramo..."
                value={searchCaseId}
                onChange={e => setSearchCaseId(e.target.value)}
                className="h-8 text-xs mt-2"
              />
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredCases.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedCaseId(s.id); setMessages([]) }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                    selectedCaseId === s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{s.id}</span>
                    <span className={cn(
                      'shrink-0 text-[10px] font-semibold px-1 py-0.5 rounded',
                      selectedCaseId === s.id
                        ? 'bg-white/20 text-white'
                        : s.nivelRiesgo === 'ROJO'
                          ? 'bg-red-100 text-red-700'
                          : s.nivelRiesgo === 'AMARILLO'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {s.scoreFinal}
                    </span>
                  </div>
                  <div className={cn('truncate mt-0.5', selectedCaseId === s.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {s.ramo} · {s.cobertura}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chat Panel */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedCase ? (
                    <>
                      <div className={cn('px-3 py-1 rounded-lg border text-sm font-semibold', riskColor(selectedCase.nivelRiesgo))}>
                        {selectedCase.id}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedCase.ramo} · Score: {selectedCase.scoreFinal}/100
                      </div>
                      <Badge variant={riskBadgeVariant(selectedCase.nivelRiesgo) as any}>
                        {selectedCase.nivelRiesgo}
                      </Badge>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Selecciona un caso del panel izquierdo
                    </span>
                  )}
                </div>
                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setMessages([])}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-5">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Asistente de Casos</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      {selectedCase
                        ? `Caso ${selectedCase.id} cargado. Hazme cualquier pregunta sobre este siniestro.`
                        : 'Selecciona un caso del panel izquierdo para comenzar el análisis.'}
                    </p>
                  </div>
                  {selectedCase && (
                    <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                      {SUGERENCIAS_CHAT.map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 text-left justify-start"
                          onClick={() => handleSuggestion(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Este agente genera alertas de revisión, no acusaciones de fraude.
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    Analizando...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-border p-4 shrink-0">
              {messages.length > 0 && selectedCase && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {SUGERENCIAS_CHAT.slice(0, 3).map((s, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => handleSuggestion(s)} disabled={isLoading}>
                      {s}
                    </Button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder={selectedCase ? `Pregunta sobre ${selectedCase.id}...` : 'Selecciona un caso primero...'}
                  disabled={isLoading || !selectedCaseId}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !inputValue.trim() || !selectedCaseId}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

        {/* NLP TAB */}
        <TabsContent value="nlp" className="flex-1 flex gap-4 mt-4 min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="w-4 h-4 text-primary" />
                Análisis de Texto de Reclamo (NLP)
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pega el texto del reclamo o descripción del siniestro para detectar patrones sospechosos
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
              <div className="flex flex-col gap-3">
                <Textarea
                  placeholder="Pega aquí el texto del reclamo, descripción del siniestro, o declaración del asegurado..."
                  value={nlpText}
                  onChange={e => setNlpText(e.target.value)}
                  className="min-h-[140px] text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{nlpText.length} caracteres</span>
                  <Button onClick={handleAnalyzeNlp} disabled={!nlpText.trim() || isAnalyzingNlp} size="sm">
                    {isAnalyzingNlp ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</>
                    ) : (
                      <><Brain className="w-4 h-4 mr-2" />Analizar Texto</>
                    )}
                  </Button>
                </div>
              </div>

              {nlpResult && (
                <div className="space-y-4">
                  {/* Score Header */}
                  <div className={cn('flex items-center justify-between p-4 rounded-lg border', riskColor(nlpResult.nivel))}>
                    <div className="flex items-center gap-3">
                      {nlpResult.nivel === 'ROJO' ? <AlertCircle className="w-5 h-5" /> :
                       nlpResult.nivel === 'AMARILLO' ? <AlertTriangle className="w-5 h-5" /> :
                       <CheckCircle className="w-5 h-5" />}
                      <div>
                        <div className="font-semibold">Nivel de Riesgo: {nlpResult.nivel}</div>
                        <div className="text-xs opacity-80">{nlpResult.resumen}</div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold">{nlpResult.score}</div>
                  </div>

                  <Progress
                    value={nlpResult.score}
                    className={cn('h-2', nlpResult.nivel === 'ROJO' ? '[&>div]:bg-red-500' : nlpResult.nivel === 'AMARILLO' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500')}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Palabras Clave */}
                    <Card className="p-4">
                      <div className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Palabras Clave Detectadas
                      </div>
                      {nlpResult.palabrasClave.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {nlpResult.palabrasClave.map((kw, i) => (
                            <Badge
                              key={i}
                              variant={kw.weight === 'alta' ? 'destructive' : kw.weight === 'media' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {kw.word}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin palabras clave de riesgo</p>
                      )}
                    </Card>

                    {/* Entidades */}
                    <Card className="p-4">
                      <div className="text-sm font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Entidades Extraídas
                      </div>
                      {nlpResult.entidades.length > 0 ? (
                        <div className="space-y-2">
                          {nlpResult.entidades.map((e, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{e.tipo}</span>
                              <span className="font-medium">{e.valor}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No se extrajeron entidades</p>
                      )}
                    </Card>
                  </div>

                  {/* Alertas */}
                  {nlpResult.alertas.length > 0 && (
                    <Card className="p-4 border-red-200 bg-red-50/50">
                      <div className="text-sm font-medium mb-3 flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        Alertas del Análisis
                      </div>
                      <div className="space-y-1.5">
                        {nlpResult.alertas.map((a, i) => (
                          <div key={i} className="text-xs flex items-start gap-2 text-red-700">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
