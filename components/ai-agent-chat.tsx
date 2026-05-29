'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateAIResponse, analyzeDocument, type UploadedCase, type FraudAnalysis } from '@/lib/fraud-analyzer'

const PREGUNTAS_SUGERIDAS = [
  "Cuales son los 10 siniestros con mayor riesgo de posible fraude?",
  "Que proveedores concentran mas alertas rojas?",
  "Que ramos tienen mayor porcentaje de casos sospechosos?",
  "Que sucursales presentan mayor concentracion de alertas?",
  "Genera un resumen ejecutivo de los casos criticos.",
  "Que patrones se repiten en los reclamos sospechosos?",
  "Recomienda que casos deberia revisar primero el analista.",
  "Explica la metodologia de scoring utilizada.",
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIAgentChat() {
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedCases, setUploadedCases] = useState<UploadedCase[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simular delay de respuesta
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))

    const aiResponse = generateAIResponse(text)
    
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsLoading(false)
  }, [inputValue, isLoading])

  const handleSuggestedQuestion = useCallback((question: string) => {
    if (isLoading) return
    setInputValue(question)
    // Trigger submit after state update
    setTimeout(() => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setIsLoading(true)

      setTimeout(async () => {
        const aiResponse = generateAIResponse(question)
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }, 800 + Math.random() * 1200)
    }, 0)
  }, [isLoading])

  const clearChat = () => {
    setMessages([])
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsAnalyzing(true)

    for (const file of Array.from(files)) {
      try {
        const content = await readFileContent(file)
        
        // Determinar tipo de documento
        let type: UploadedCase['type'] = 'otro'
        const nameLower = file.name.toLowerCase()
        if (nameLower.includes('factura') || nameLower.includes('invoice')) {
          type = 'factura'
        } else if (nameLower.includes('poliza') || nameLower.includes('policy')) {
          type = 'poliza'
        } else if (nameLower.includes('reporte') || nameLower.includes('report')) {
          type = 'reporte'
        }

        // Simular delay de analisis
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))

        const analysis = analyzeDocument(content, file.name)

        const newCase: UploadedCase = {
          id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          type,
          content,
          uploadedAt: new Date(),
          analysis
        }

        setUploadedCases(prev => [...prev, newCase])
      } catch (error) {
        console.error('Error processing file:', error)
      }
    }

    setIsAnalyzing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          resolve(result)
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  const removeCase = (id: string) => {
    setUploadedCases(prev => prev.filter(c => c.id !== id))
  }

  const getRiskColor = (nivel: FraudAnalysis['nivelRiesgo']) => {
    switch (nivel) {
      case 'ROJO': return 'text-[var(--risk-high)] bg-[var(--risk-high)]/10'
      case 'AMARILLO': return 'text-[var(--risk-medium)] bg-[var(--risk-medium)]/10'
      case 'VERDE': return 'text-[var(--risk-low)] bg-[var(--risk-low)]/10'
    }
  }

  const getRiskIcon = (nivel: FraudAnalysis['nivelRiesgo']) => {
    switch (nivel) {
      case 'ROJO': return <AlertCircle className="w-4 h-4" />
      case 'AMARILLO': return <AlertTriangle className="w-4 h-4" />
      case 'VERDE': return <CheckCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="p-6 h-[calc(100vh-2rem)]">
      <div className="flex flex-col h-full max-w-5xl mx-auto gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              Agente IA Antifraude
            </h1>
            <p className="text-muted-foreground">
              Consultas y analisis de documentos para deteccion de fraude
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat IA
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Analizar Documentos
              {uploadedCases.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {uploadedCases.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
            {/* Chat Container */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>El agente tiene acceso al analisis completo de 500 siniestros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {messages.length} mensajes
                    </Badge>
                    {messages.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearChat}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Nueva conversacion
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Welcome Message */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Bienvenido al Agente Antifraude</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Puedo ayudarte a analizar patrones de fraude, identificar casos sospechosos,
                        y generar reportes sobre los siniestros. Hazme cualquier pregunta.
                      </p>
                    </div>

                    {/* Suggested Questions */}
                    <div className="w-full max-w-2xl">
                      <p className="text-xs text-muted-foreground mb-3">Preguntas sugeridas:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PREGUNTAS_SUGERIDAS.slice(0, 4).map((pregunta, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="justify-start text-left h-auto py-2 px-3 text-xs"
                            onClick={() => handleSuggestedQuestion(pregunta)}
                          >
                            {pregunta}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-[var(--risk-medium)]" />
                      Este agente genera alertas de revision, NO acusaciones de fraude.
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                        {message.content}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>Analizando...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input Area */}
              <div className="border-t border-border p-4">
                {/* Quick Actions */}
                {messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PREGUNTAS_SUGERIDAS.slice(0, 3).map((pregunta, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSuggestedQuestion(pregunta)}
                        disabled={isLoading}
                      >
                        {pregunta.substring(0, 40)}...
                      </Button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Escribe tu pregunta sobre los siniestros..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 flex flex-col mt-4">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Sube facturas, polizas o reportes para analisis de fraude</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.csv,.json,.xml,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1" />
                        Subir documentos
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4">
                {uploadedCases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Sube documentos para analizar</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Arrastra archivos o haz clic en el boton para subir facturas,
                        polizas o reportes de siniestros. El sistema los analizara
                        automaticamente en busca de posibles irregularidades.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline">.txt</Badge>
                      <Badge variant="outline">.csv</Badge>
                      <Badge variant="outline">.json</Badge>
                      <Badge variant="outline">.xml</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploadedCases.map((caseItem) => (
                      <Card key={caseItem.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                caseItem.analysis ? getRiskColor(caseItem.analysis.nivelRiesgo) : 'bg-muted'
                              )}>
                                {caseItem.analysis ? getRiskIcon(caseItem.analysis.nivelRiesgo) : (
                                  <FileText className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{caseItem.fileName}</h4>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {caseItem.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Subido: {caseItem.uploadedAt.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => removeCase(caseItem.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {caseItem.analysis && (
                            <div className="mt-4 space-y-4">
                              {/* Score y nivel */}
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Score:</span>
                                  <span className="text-2xl font-bold">
                                    {caseItem.analysis.scoreFinal}
                                  </span>
                                  <span className="text-sm text-muted-foreground">/100</span>
                                </div>
                                <Badge className={cn(
                                  'text-sm',
                                  getRiskColor(caseItem.analysis.nivelRiesgo)
                                )}>
                                  {caseItem.analysis.nivelRiesgo}
                                </Badge>
                              </div>

                              {/* Alertas */}
                              <div>
                                <h5 className="text-sm font-medium mb-2">Alertas detectadas:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {caseItem.analysis.alertas.map((alerta, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className={cn(
                                        'text-xs',
                                        alerta.toLowerCase().includes('alto') || alerta.toLowerCase().includes('restrictiva')
                                          ? 'border-[var(--risk-high)] text-[var(--risk-high)]'
                                          : ''
                                      )}
                                    >
                                      {alerta}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Recomendaciones */}
                              <div>
                                <h5 className="text-sm font-medium mb-2">Recomendaciones:</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {caseItem.analysis.recomendaciones.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Explicacion */}
                              <div className="bg-muted/50 rounded-lg p-3">
                                <h5 className="text-sm font-medium mb-2">Analisis detallado:</h5>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {caseItem.analysis.explicacion}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
