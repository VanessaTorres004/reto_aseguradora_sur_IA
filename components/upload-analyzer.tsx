'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Shield,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { analyzeDocument, type UploadedCase, type FraudAnalysis } from '@/lib/fraud-analyzer'
import { cn } from '@/lib/utils'

type RiskLevel = 'ROJO' | 'AMARILLO' | 'VERDE'

const RISK_CONFIG = {
  ROJO: {
    label: 'Alto Riesgo',
    badgeClass: 'bg-[var(--risk-high)] text-white',
    borderClass: 'border-[var(--risk-high)]',
    bgClass: 'bg-[var(--risk-high)]/5',
    icon: ShieldAlert,
    textClass: 'text-[var(--risk-high)]',
  },
  AMARILLO: {
    label: 'Riesgo Medio',
    badgeClass: 'bg-[var(--risk-medium)] text-black',
    borderClass: 'border-[var(--risk-medium)]',
    bgClass: 'bg-[var(--risk-medium)]/5',
    icon: Shield,
    textClass: 'text-[var(--risk-medium)]',
  },
  VERDE: {
    label: 'Bajo Riesgo',
    badgeClass: 'bg-[var(--risk-low)] text-white',
    borderClass: 'border-[var(--risk-low)]',
    bgClass: 'bg-[var(--risk-low)]/5',
    icon: ShieldCheck,
    textClass: 'text-[var(--risk-low)]',
  },
}

const ACCEPTED_TYPES = [
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
]

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_CONFIG[level]
  return (
    <Badge className={config.badgeClass}>
      {level === 'ROJO' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {level === 'AMARILLO' && <AlertCircle className="w-3 h-3 mr-1" />}
      {level === 'VERDE' && <CheckCircle className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

function ScoreBar({ score, level }: { score: number; level: RiskLevel }) {
  const color =
    level === 'ROJO'
      ? 'var(--risk-high)'
      : level === 'AMARILLO'
      ? 'var(--risk-medium)'
      : 'var(--risk-low)'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Score de Riesgo</span>
        <span className="font-bold" style={{ color }}>
          {score}/100
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function AnalysisResult({
  uploadedCase,
  onRemove,
}: {
  uploadedCase: UploadedCase
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const analysis = uploadedCase.analysis

  if (!analysis) return null

  const config = RISK_CONFIG[analysis.nivelRiesgo]
  const RiskIcon = config.icon

  return (
    <Card className={cn('border-2 transition-all', config.borderClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                config.bgClass
              )}
            >
              <RiskIcon className={cn('w-5 h-5', config.textClass)} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{uploadedCase.fileName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {uploadedCase.type}
                </Badge>
                <span className="text-xs">
                  {new Date(uploadedCase.uploadedAt).toLocaleTimeString('es-EC', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RiskBadge level={analysis.nivelRiesgo} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(uploadedCase.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5">
          {/* Score Bar */}
          <ScoreBar score={analysis.scoreFinal} level={analysis.nivelRiesgo} />

          <Separator />

          {/* Detected Details */}
          {(analysis.detalles.montoDetectado ||
            analysis.detalles.fechaEvento ||
            analysis.detalles.poliza ||
            analysis.detalles.proveedor) && (
            <div className="grid grid-cols-2 gap-3">
              {analysis.detalles.montoDetectado && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Monto Detectado</div>
                  <div className="font-semibold text-sm">
                    ${analysis.detalles.montoDetectado.toLocaleString()}
                  </div>
                </div>
              )}
              {analysis.detalles.fechaEvento && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Fecha Evento</div>
                  <div className="font-semibold text-sm">{analysis.detalles.fechaEvento}</div>
                </div>
              )}
              {analysis.detalles.poliza && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Poliza</div>
                  <div className="font-semibold text-sm">{analysis.detalles.poliza}</div>
                </div>
              )}
              {analysis.detalles.proveedor && (
                <div className="p-3 rounded-lg bg-[var(--risk-high)]/10 border border-[var(--risk-high)]/30">
                  <div className="text-xs text-[var(--risk-high)] mb-1">Proveedor Restrictivo</div>
                  <div className="font-semibold text-sm capitalize">{analysis.detalles.proveedor}</div>
                </div>
              )}
            </div>
          )}

          {/* Alerts */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Alertas Detectadas</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {analysis.alertas.map((alerta, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
                    alerta.includes('Sin alertas')
                      ? 'bg-[var(--risk-low)]/10 text-[var(--risk-low)]'
                      : 'bg-[var(--risk-high)]/10 text-[var(--risk-high)]'
                  )}
                >
                  {alerta.includes('Sin alertas') ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  {alerta}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recomendaciones</h4>
            <ul className="space-y-1.5">
              {analysis.recomendaciones.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span
                    className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', config.textClass)}
                    style={{ backgroundColor: `var(--risk-${analysis.nivelRiesgo === 'ROJO' ? 'high' : analysis.nivelRiesgo === 'AMARILLO' ? 'medium' : 'low'})` }}
                  />
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Importante:</strong> Esta es una alerta de revision automatica, NO una acusacion de fraude. Toda decision requiere validacion humana.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function UploadAnalyzer() {
  const [cases, setCases] = useState<UploadedCase[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectFileType = (fileName: string): UploadedCase['type'] => {
    const lower = fileName.toLowerCase()
    if (lower.includes('factura') || lower.includes('invoice')) return 'factura'
    if (lower.includes('poliza') || lower.includes('policy')) return 'poliza'
    if (lower.includes('reporte') || lower.includes('report')) return 'reporte'
    return 'otro'
  }

  const processFile = useCallback(async (file: File) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const type = detectFileType(file.name)

    // Read file content
    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        resolve(text || '')
      }
      // For non-text files, use the filename + metadata as content
      if (file.type === 'text/plain' || file.type === 'text/csv' || file.type === 'application/json') {
        reader.readAsText(file)
      } else {
        // For PDFs/Excel, simulate content from filename for demo purposes
        resolve(`Archivo: ${file.name}\nTipo: ${file.type}\nTamano: ${(file.size / 1024).toFixed(1)} KB\nFecha: ${new Date().toLocaleDateString()}`)
      }
    })

    const newCase: UploadedCase = {
      id,
      fileName: file.name,
      type,
      content,
      uploadedAt: new Date(),
    }

    setCases((prev) => [newCase, ...prev])
    setAnalyzing((prev) => [...prev, id])

    // Simulate analysis delay for UX
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800))

    const analysis = analyzeDocument(content, file.name)

    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, analysis } : c))
    )
    setAnalyzing((prev) => prev.filter((a) => a !== id))
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      Array.from(files).forEach((file) => {
        processFile(file)
      })
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const removeCase = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id))
  }

  const clearAll = () => setCases([])

  const stats = {
    total: cases.filter((c) => c.analysis).length,
    rojos: cases.filter((c) => c.analysis?.nivelRiesgo === 'ROJO').length,
    amarillos: cases.filter((c) => c.analysis?.nivelRiesgo === 'AMARILLO').length,
    verdes: cases.filter((c) => c.analysis?.nivelRiesgo === 'VERDE').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subir y Analizar Documentos</h1>
          <p className="text-muted-foreground">
            Sube casos o facturas para detectar posibles irregularidades automaticamente
          </p>
        </div>
        {cases.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Limpiar todo
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-14 text-center transition-all',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-muted/40'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.csv,.pdf,.xls,.xlsx,.json"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-colors',
            isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted'
          )}
        >
          <Upload className={cn('w-7 h-7', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="text-base font-semibold">
            {isDragging ? 'Suelta los archivos aqui' : 'Arrastra archivos o haz click para seleccionar'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Soporta PDF, TXT, CSV, Excel y JSON — facturas, polizas y reportes de siniestros
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {['Facturas', 'Polizas', 'Reportes', 'Siniestros'].map((label) => (
            <Badge key={label} variant="secondary" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Analizados</div>
            </CardContent>
          </Card>
          <Card className="border-[var(--risk-high)]/40">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-[var(--risk-high)]">{stats.rojos}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Alto Riesgo</div>
            </CardContent>
          </Card>
          <Card className="border-[var(--risk-medium)]/40">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-[var(--risk-medium)]">{stats.amarillos}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Riesgo Medio</div>
            </CardContent>
          </Card>
          <Card className="border-[var(--risk-low)]/40">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-[var(--risk-low)]">{stats.verdes}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Bajo Riesgo</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processing Items */}
      {analyzing.length > 0 && (
        <div className="space-y-2">
          {cases
            .filter((c) => analyzing.includes(c.id))
            .map((c) => (
              <Card key={c.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.fileName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={undefined} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analizando...
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => removeCase(c.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Results */}
      {cases.filter((c) => c.analysis).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Resultados del Analisis</h2>
          <div className="space-y-4">
            {cases
              .filter((c) => c.analysis)
              .map((c) => (
                <AnalysisResult key={c.id} uploadedCase={c} onRemove={removeCase} />
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {cases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
            <Shield className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-base font-medium">Sin documentos cargados</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sube facturas o reportes de casos para iniciar el analisis de fraude
          </p>
        </div>
      )}
    </div>
  )
}
