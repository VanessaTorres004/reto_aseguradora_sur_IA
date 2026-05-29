'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
import { analyzeDocument, type UploadedCase, type FraudAnalysis } from '@/lib/fraud-analyzer'

const PREGUNTAS_SUGERIDAS = [
  'Cuales son los 10 siniestros con mayor riesgo de posible fraude?',
  'Que proveedores concentran mas alertas rojas?',
  'Que ramos tienen mayor porcentaje de casos sospechosos?',
  'Que sucursales presentan mayor concentracion de alertas?',
  'Genera un resumen ejecutivo de los casos criticos.',
  'Que patrones se repiten en los reclamos sospechosos?',
  'Recomienda que casos deberia revisar primero el analista.',
  'Explica la metodologia de scoring utilizada.',
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

async function requestAIResponse(messages: Message[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo conectar con el agente IA')
  }

  return data.response || 'No se generó una respuesta del agente IA.'
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold mb-3">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mb-3">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-4 mb-2">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="text-muted-foreground">
            {children}
          </em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">
            {children}
          </li>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/80">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold border-b border-border whitespace-nowrap">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-border align-top">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    try {
      const aiResponse = await requestAIResponse(updatedMessages)

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error calling AI agent:', error)

      const assistantMessage: Message = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: 'No pude conectar con el agente IA en este momento. Verifica que la variable GROQ_API_KEY esté configurada en el archivo .env.local o en las variables de entorno del despliegue.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    await sendMessage(inputValue)
  }, [inputValue, sendMessage])

  const handleSuggestedQuestion = useCallback((question: string) => {
    if (isLoading) return
    void sendMessage(question)
  }, [isLoading, sendMessage])

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

        let type: UploadedCase['type'] = 'otro'
        const nameLower = file.name.toLowerCase()

        if (nameLower.includes('factura') || nameLower.includes('invoice')) {
          type = 'factura'
        } else if (nameLower.includes('poliza') || nameLower.includes('policy')) {
          type = 'poliza'
        } else if (nameLower.includes('reporte') || nameLower.includes('report')) {
          type = 'reporte'
        }

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
      case 'ROJO':
        return 'text-[var(--risk-high)] bg-[var(--risk-high)]/10'
      case 'AMARILLO':
        return 'text-[var(--risk-medium)] bg-[var(--risk-medium)]/10'
      case 'VERDE':
        return 'text-[var(--risk-low)] bg-[var(--risk-low)]/10'
    }
  }

  const getRiskIcon = (nivel: FraudAnalysis['nivelRiesgo']) => {
    switch (nivel) {
      case 'ROJO':
        return <AlertCircle className="w-4 h-4" />
      case 'AMARILLO':
        return <AlertTriangle className="w-4 h-4" />
      case 'VERDE':
        return <CheckCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="p-6 h-[calc(100vh-2rem)]">
      <div className="flex flex-col h-full max-w-5xl mx-auto gap-6">
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

                    <div className="w-full max-w-2xl">
                      <p className="text-xs text-muted-foreground mb-3">
                        Preguntas sugeridas:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {PREGUNTAS_SUGERIDAS.slice(0, 4).map((pregunta, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="justify-start text-left h-auto min-h-[48px] py-2 px-3 text-xs whitespace-normal leading-snug break-words"
                            onClick={() => handleSuggestedQuestion(pregunta)}
                          >
                            {pregunta}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-[var(--risk-medium)]" />
                      Este agente genera alertas de revision, NO acusaciones de fraude.
                    </div>
                  </div>
                )}

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
                      <div className="text-sm leading-relaxed">
                        {message.role === 'assistant' ? (
                          <MarkdownMessage content={message.content} />
                        ) : (
                          <span className="whitespace-pre-wrap">
                            {message.content}
                          </span>
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>

                    <div className="bg-muted rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <span
                            className="w-2 h-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-2 h-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-2 h-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span>Analizando...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>

              <div className="border-t border-border p-4">
                {messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PREGUNTAS_SUGERIDAS.slice(0, 3).map((pregunta, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto min-h-[36px] whitespace-normal leading-snug text-left justify-start max-w-[280px]"
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
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-lg flex items-center justify-center',
                                  caseItem.analysis
                                    ? getRiskColor(caseItem.analysis.nivelRiesgo)
                                    : 'bg-muted'
                                )}
                              >
                                {caseItem.analysis ? (
                                  getRiskIcon(caseItem.analysis.nivelRiesgo)
                                ) : (
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
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Score:</span>
                                  <span className="text-2xl font-bold">
                                    {caseItem.analysis.scoreFinal}
                                  </span>
                                  <span className="text-sm text-muted-foreground">/100</span>
                                </div>

                                <Badge
                                  className={cn(
                                    'text-sm',
                                    getRiskColor(caseItem.analysis.nivelRiesgo)
                                  )}
                                >
                                  {caseItem.analysis.nivelRiesgo}
                                </Badge>
                              </div>

                              <div>
                                <h5 className="text-sm font-medium mb-2">Alertas detectadas:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {caseItem.analysis.alertas.map((alerta, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className={cn(
                                        'text-xs',
                                        alerta.toLowerCase().includes('alto') ||
                                        alerta.toLowerCase().includes('restrictiva')
                                          ? 'border-[var(--risk-high)] text-[var(--risk-high)]'
                                          : ''
                                      )}
                                    >
                                      {alerta}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

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