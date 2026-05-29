'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign,
  X
} from 'lucide-react'
import { siniestros, getRamos, getSucursales, proveedores, asegurados } from '@/lib/data'
import type { Siniestro, RiskLevel } from '@/lib/data'

const ITEMS_PER_PAGE = 15

const RISK_COLORS = {
  ROJO: '#dc2626',
  AMARILLO: '#f59e0b',
  VERDE: '#16a34a'
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    ROJO: { label: 'ROJO', className: 'bg-[var(--risk-high)] text-white', icon: AlertTriangle },
    AMARILLO: { label: 'AMARILLO', className: 'bg-[var(--risk-medium)] text-black', icon: AlertCircle },
    VERDE: { label: 'VERDE', className: 'bg-[var(--risk-low)] text-white', icon: CheckCircle }
  }

  const { label, className, icon: Icon } = config[level]

  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  )
}

function CaseDetailModal({ 
  caso, 
  open, 
  onClose 
}: { 
  caso: Siniestro | null
  open: boolean
  onClose: () => void 
}) {
  if (!caso) return null

  const proveedor = proveedores.find(p => p.id === caso.idProveedor)
  const asegurado = asegurados.find(a => a.id === caso.idAsegurado)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span>{caso.id}</span>
              <RiskBadge level={caso.nivelRiesgo} />
            </DialogTitle>
          </div>
          <DialogDescription>
            Detalle completo del siniestro y analisis de riesgo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Score Section */}
          <div className="p-4 rounded-lg border" style={{ borderColor: RISK_COLORS[caso.nivelRiesgo] }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Score Final</h3>
              <span className="text-3xl font-bold" style={{ color: RISK_COLORS[caso.nivelRiesgo] }}>
                {caso.scoreFinal}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center p-2 rounded bg-muted">
                <div className="text-muted-foreground">Reglas</div>
                <div className="font-medium">{caso.scoreReglas}</div>
              </div>
              <div className="text-center p-2 rounded bg-muted">
                <div className="text-muted-foreground">ML</div>
                <div className="font-medium">{caso.scoreML}</div>
              </div>
              <div className="text-center p-2 rounded bg-muted">
                <div className="text-muted-foreground">Anomalia</div>
                <div className="font-medium">{caso.scoreAnomalia}</div>
              </div>
              <div className="text-center p-2 rounded bg-muted">
                <div className="text-muted-foreground">NLP</div>
                <div className="font-medium">{caso.scoreNLP}</div>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Informacion del Siniestro
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ramo:</span>
                  <span>{caso.ramo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobertura:</span>
                  <span>{caso.cobertura}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant="outline">{caso.estado}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sucursal:</span>
                  <span>{caso.sucursal}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fechas y Tiempos
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha Ocurrencia:</span>
                  <span>{caso.fechaOcurrencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha Reporte:</span>
                  <span>{caso.fechaReporte}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dias para reportar:</span>
                  <span className={caso.diasReporte > 5 ? 'text-[var(--risk-high)]' : ''}>
                    {caso.diasReporte} dias
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dias desde inicio poliza:</span>
                  <span className={caso.diasDesdeInicio < 30 ? 'text-[var(--risk-high)]' : ''}>
                    {caso.diasDesdeInicio} dias
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Montos
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto Reclamado:</span>
                  <span className="font-medium">${caso.montoReclamado.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto Estimado:</span>
                  <span>${caso.montoEstimado.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suma Asegurada:</span>
                  <span>${caso.sumaAsegurada.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ratio Reclamado/SA:</span>
                  <span className={caso.montoReclamado / caso.sumaAsegurada > 0.9 ? 'text-[var(--risk-high)]' : ''}>
                    {((caso.montoReclamado / caso.sumaAsegurada) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Asegurado
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span>{caso.idAsegurado}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>{asegurado?.nombre || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reclamos previos:</span>
                  <span className={caso.reclamosPrevios >= 3 ? 'text-[var(--risk-high)]' : ''}>
                    {caso.reclamosPrevios}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Proveedor Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Proveedor
            </h4>
            <div className={`p-4 rounded-lg border ${proveedor?.listaRestrictiva ? 'border-[var(--risk-high)] bg-[var(--risk-high)]/10' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{proveedor?.nombre}</div>
                  <div className="text-sm text-muted-foreground">{proveedor?.tipo} - {proveedor?.ciudad}</div>
                </div>
                {proveedor?.listaRestrictiva && (
                  <Badge className="bg-[var(--risk-high)] text-white">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Lista Restrictiva
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-medium">Descripcion del Evento</h4>
            <p className="text-sm text-muted-foreground p-3 rounded bg-muted">
              {caso.descripcion}
            </p>
          </div>

          {/* Alerts */}
          <div className="space-y-2">
            <h4 className="font-medium">Alertas Detectadas</h4>
            <div className="space-y-2">
              {caso.alertas.map((alerta, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded text-sm flex items-start gap-2 ${
                    alerta.includes('Sin alertas') 
                      ? 'bg-[var(--risk-low)]/10 text-[var(--risk-low)]' 
                      : 'bg-[var(--risk-high)]/10 text-[var(--risk-high)]'
                  }`}
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

          {/* Additional Metrics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded bg-muted text-center">
              <div className="text-muted-foreground">Similitud Narrativa</div>
              <div className={`font-medium ${caso.similitudNarrativa > 0.7 ? 'text-[var(--risk-high)]' : ''}`}>
                {(caso.similitudNarrativa * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-3 rounded bg-muted text-center">
              <div className="text-muted-foreground">Documentos</div>
              <div className={caso.documentosCompletos ? 'text-[var(--risk-low)]' : 'text-[var(--risk-high)]'}>
                {caso.documentosCompletos ? 'Completos' : 'Incompletos'}
              </div>
            </div>
            <div className="p-3 rounded bg-muted text-center">
              <div className="text-muted-foreground">Poliza</div>
              <div className="font-medium">{caso.idPoliza}</div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Importante:</strong> Esta informacion es una alerta de revision, NO una acusacion de fraude.
              Toda decision requiere revision humana especializada.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CasesTable() {
  const [searchTerm, setSearchTerm] = useState('')
  const [ramoFilter, setRamoFilter] = useState<string>('todos')
  const [sucursalFilter, setSucursalFilter] = useState<string>('todos')
  const [riesgoFilter, setRiesgoFilter] = useState<string>('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<'scoreFinal' | 'montoReclamado' | 'fechaOcurrencia'>('scoreFinal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCase, setSelectedCase] = useState<Siniestro | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const ramos = getRamos()
  const sucursales = getSucursales()

  const filteredCases = useMemo(() => {
    let filtered = [...siniestros]

    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(term) ||
        s.idAsegurado.toLowerCase().includes(term) ||
        s.descripcion.toLowerCase().includes(term)
      )
    }

    if (ramoFilter !== 'todos') {
      filtered = filtered.filter(s => s.ramo === ramoFilter)
    }

    if (sucursalFilter !== 'todos') {
      filtered = filtered.filter(s => s.sucursal === sucursalFilter)
    }

    if (riesgoFilter !== 'todos') {
      filtered = filtered.filter(s => s.nivelRiesgo === riesgoFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : 1
      }
      return aVal > bVal ? -1 : 1
    })

    return filtered
  }, [searchTerm, ramoFilter, sucursalFilter, riesgoFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE)
  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setRamoFilter('todos')
    setSucursalFilter('todos')
    setRiesgoFilter('todos')
    setCurrentPage(1)
  }

  const openCaseDetail = (caso: Siniestro) => {
    setSelectedCase(caso)
    setModalOpen(true)
  }

  const hasActiveFilters = searchTerm || ramoFilter !== 'todos' || sucursalFilter !== 'todos' || riesgoFilter !== 'todos'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bandeja de Casos</h1>
          <p className="text-muted-foreground">
            Gestion y revision de siniestros
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {filteredCases.length} casos
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, asegurado o descripcion..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={ramoFilter} onValueChange={(v) => { setRamoFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ramo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los ramos</SelectItem>
                {ramos.map(ramo => (
                  <SelectItem key={ramo} value={ramo}>{ramo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sucursalFilter} onValueChange={(v) => { setSucursalFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las sucursales</SelectItem>
                {sucursales.map(suc => (
                  <SelectItem key={suc} value={suc}>{suc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riesgoFilter} onValueChange={(v) => { setRiesgoFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Nivel de riesgo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los niveles</SelectItem>
                <SelectItem value="ROJO">Alto Riesgo</SelectItem>
                <SelectItem value="AMARILLO">Riesgo Medio</SelectItem>
                <SelectItem value="VERDE">Bajo Riesgo</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" size="icon" onClick={clearFilters}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Ramo/Cobertura</TableHead>
                <TableHead>Asegurado</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('montoReclamado')}
                >
                  <div className="flex items-center gap-1">
                    Monto
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('scoreFinal')}
                >
                  <div className="flex items-center gap-1">
                    Score
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCases.map((caso) => (
                <TableRow key={caso.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">{caso.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{caso.ramo}</div>
                      <div className="text-xs text-muted-foreground">{caso.cobertura}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{caso.idAsegurado}</TableCell>
                  <TableCell>{caso.sucursal}</TableCell>
                  <TableCell className="font-medium">${caso.montoReclamado.toLocaleString()}</TableCell>
                  <TableCell>
                    <span 
                      className="font-bold text-lg" 
                      style={{ color: RISK_COLORS[caso.nivelRiesgo] }}
                    >
                      {caso.scoreFinal}
                    </span>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={caso.nivelRiesgo} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{caso.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openCaseDetail(caso)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCases.length)} de {filteredCases.length} casos
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Pagina {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Case Detail Modal */}
      <CaseDetailModal 
        caso={selectedCase} 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  )
}
