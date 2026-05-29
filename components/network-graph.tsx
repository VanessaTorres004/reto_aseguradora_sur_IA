'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Network,
  Filter,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertTriangle,
  User,
  Building2,
  FileWarning,
  Info
} from 'lucide-react'
import { siniestros, proveedores, asegurados } from '@/lib/data'
import type { RiskLevel } from '@/lib/data'

const RISK_COLORS = {
  ROJO: '#dc2626',
  AMARILLO: '#f59e0b',
  VERDE: '#16a34a'
}

interface NetworkNode {
  id: string
  type: 'asegurado' | 'proveedor' | 'siniestro'
  label: string
  x: number
  y: number
  size: number
  color: string
  riesgo?: RiskLevel
  score?: number
  enLista?: boolean
  connections: number
}

interface NetworkEdge {
  source: string
  target: string
  tipo: 'asegurado-siniestro' | 'siniestro-proveedor'
  alerta: boolean
}

export function NetworkGraph() {
  const [scoreThreshold, setScoreThreshold] = useState(40)
  const [filterType, setFilterType] = useState<'todos' | 'rojos' | 'proveedores-lista'>('todos')
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Build network data
  const networkData = useMemo(() => {
    // Filter siniestros based on settings
    let filteredSiniestros = siniestros.filter(s => s.scoreFinal >= scoreThreshold)
    
    if (filterType === 'rojos') {
      filteredSiniestros = filteredSiniestros.filter(s => s.nivelRiesgo === 'ROJO')
    } else if (filterType === 'proveedores-lista') {
      filteredSiniestros = filteredSiniestros.filter(s => s.proveedorListaRestrictiva)
    }

    // Limit to 50 cases for performance
    filteredSiniestros = filteredSiniestros.slice(0, 50)

    const nodes: NetworkNode[] = []
    const edges: NetworkEdge[] = []
    const nodeMap = new Map<string, NetworkNode>()

    // Count connections for each entity
    const connectionCount = new Map<string, number>()
    
    filteredSiniestros.forEach(s => {
      connectionCount.set(s.idAsegurado, (connectionCount.get(s.idAsegurado) || 0) + 1)
      connectionCount.set(s.idProveedor, (connectionCount.get(s.idProveedor) || 0) + 1)
    })

    // Create nodes for siniestros (center)
    const totalNodes = filteredSiniestros.length
    const siniestroRadius = 200
    
    filteredSiniestros.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / Math.max(totalNodes, 1)
      const node: NetworkNode = {
        id: s.id,
        type: 'siniestro',
        label: s.id,
        x: 400 + siniestroRadius * Math.cos(angle),
        y: 300 + siniestroRadius * Math.sin(angle),
        size: 8 + (s.scoreFinal / 10),
        color: RISK_COLORS[s.nivelRiesgo],
        riesgo: s.nivelRiesgo,
        score: s.scoreFinal,
        connections: 2
      }
      nodes.push(node)
      nodeMap.set(s.id, node)
    })

    // Create nodes for unique asegurados
    const uniqueAsegurados = [...new Set(filteredSiniestros.map(s => s.idAsegurado))]
    const asegRadius = 350
    
    uniqueAsegurados.forEach((asegId, i) => {
      const aseg = asegurados.find(a => a.id === asegId)
      const angle = (2 * Math.PI * i) / Math.max(uniqueAsegurados.length, 1)
      const node: NetworkNode = {
        id: asegId,
        type: 'asegurado',
        label: aseg?.nombre || asegId,
        x: 400 + asegRadius * Math.cos(angle + 0.1),
        y: 300 + asegRadius * Math.sin(angle + 0.1),
        size: 6 + (connectionCount.get(asegId) || 0) * 3,
        color: '#60a5fa',
        connections: connectionCount.get(asegId) || 0
      }
      nodes.push(node)
      nodeMap.set(asegId, node)
    })

    // Create nodes for unique proveedores
    const uniqueProveedores = [...new Set(filteredSiniestros.map(s => s.idProveedor))]
    const provRadius = 380
    
    uniqueProveedores.forEach((provId, i) => {
      const prov = proveedores.find(p => p.id === provId)
      const angle = (2 * Math.PI * i) / Math.max(uniqueProveedores.length, 1) + Math.PI / uniqueProveedores.length
      const node: NetworkNode = {
        id: provId,
        type: 'proveedor',
        label: prov?.nombre || provId,
        x: 400 + provRadius * Math.cos(angle),
        y: 300 + provRadius * Math.sin(angle),
        size: 8 + (connectionCount.get(provId) || 0) * 4,
        color: prov?.listaRestrictiva ? RISK_COLORS.ROJO : '#fb923c',
        enLista: prov?.listaRestrictiva,
        connections: connectionCount.get(provId) || 0
      }
      nodes.push(node)
      nodeMap.set(provId, node)
    })

    // Create edges
    filteredSiniestros.forEach(s => {
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

    return { nodes, edges, nodeMap }
  }, [scoreThreshold, filterType])

  const handleNodeClick = useCallback((node: NetworkNode) => {
    setSelectedNode(node)
  }, [])

  const resetView = () => {
    setZoom(1)
    setSelectedNode(null)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const sinNodes = networkData.nodes.filter(n => n.type === 'siniestro')
    const provNodes = networkData.nodes.filter(n => n.type === 'proveedor')
    const asegNodes = networkData.nodes.filter(n => n.type === 'asegurado')
    
    return {
      totalNodes: networkData.nodes.length,
      siniestros: sinNodes.length,
      asegurados: asegNodes.length,
      proveedores: provNodes.length,
      proveedoresEnLista: provNodes.filter(n => n.enLista).length,
      conexiones: networkData.edges.length,
      alertas: networkData.edges.filter(e => e.alerta).length
    }
  }, [networkData])

  // Find connected nodes when one is selected
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    
    const connected = new Set<string>()
    connected.add(selectedNode.id)
    
    networkData.edges.forEach(edge => {
      if (edge.source === selectedNode.id) {
        connected.add(edge.target)
      }
      if (edge.target === selectedNode.id) {
        connected.add(edge.source)
      }
    })
    
    return connected
  }, [selectedNode, networkData.edges])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            Red de Relaciones
          </h1>
          <p className="text-muted-foreground">
            Grafo de conexiones entre asegurados, siniestros y proveedores
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {stats.totalNodes} nodos
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Controles del Grafo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            {/* Score Threshold */}
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-sm font-medium">
                Score minimo: {scoreThreshold}
              </label>
              <Slider
                value={[scoreThreshold]}
                onValueChange={(v) => setScoreThreshold(v[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Filter Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por</label>
              <Select value={filterType} onValueChange={(v: typeof filterType) => setFilterType(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los casos</SelectItem>
                  <SelectItem value="rojos">Solo casos rojos</SelectItem>
                  <SelectItem value="proveedores-lista">Proveedores en lista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(z => Math.min(2, z + 0.2))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={resetView}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Container */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <div className="relative overflow-hidden rounded-lg bg-muted/20" style={{ height: '600px' }}>
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${800 / zoom} ${600 / zoom}`}
                className="cursor-move"
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="var(--border)" />
                  </marker>
                </defs>

                {/* Edges */}
                <g>
                  {networkData.edges.map((edge, i) => {
                    const source = networkData.nodeMap.get(edge.source)
                    const target = networkData.nodeMap.get(edge.target)
                    if (!source || !target) return null

                    const isConnected = selectedNode 
                      ? (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target))
                      : true

                    return (
                      <line
                        key={i}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={edge.alerta ? RISK_COLORS.ROJO : 'var(--border)'}
                        strokeWidth={edge.alerta ? 2 : 1}
                        strokeOpacity={isConnected ? (edge.alerta ? 0.8 : 0.4) : 0.1}
                      />
                    )
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {networkData.nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id
                    const isConnected = selectedNode 
                      ? connectedNodeIds.has(node.id)
                      : true
                    const isHovered = hoveredNode === node.id

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => handleNodeClick(node)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ cursor: 'pointer' }}
                        opacity={isConnected ? 1 : 0.2}
                      >
                        {/* Node shape based on type */}
                        {node.type === 'asegurado' && (
                          <circle
                            r={node.size}
                            fill={node.color}
                            stroke={isSelected ? 'white' : 'none'}
                            strokeWidth={isSelected ? 3 : 0}
                            className="transition-all"
                          />
                        )}
                        {node.type === 'proveedor' && (
                          <rect
                            x={-node.size}
                            y={-node.size}
                            width={node.size * 2}
                            height={node.size * 2}
                            fill={node.color}
                            stroke={isSelected ? 'white' : 'none'}
                            strokeWidth={isSelected ? 3 : 0}
                            rx={2}
                            className="transition-all"
                          />
                        )}
                        {node.type === 'siniestro' && (
                          <polygon
                            points={`0,${-node.size} ${node.size * 0.87},${node.size * 0.5} ${-node.size * 0.87},${node.size * 0.5}`}
                            fill={node.color}
                            stroke={isSelected ? 'white' : 'none'}
                            strokeWidth={isSelected ? 3 : 0}
                            className="transition-all"
                          />
                        )}

                        {/* Label on hover */}
                        {(isHovered || isSelected) && (
                          <text
                            y={-node.size - 5}
                            textAnchor="middle"
                            fill="var(--foreground)"
                            fontSize="10"
                            fontWeight="500"
                          >
                            {node.label.substring(0, 15)}{node.label.length > 15 ? '...' : ''}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-card/95 border border-border text-xs space-y-2">
                <div className="font-medium">Leyenda</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#60a5fa]" />
                  <span>Asegurado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#fb923c]" />
                  <span>Proveedor</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#dc2626]" />
                  <span>Prov. Lista Restrictiva</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-[var(--risk-high)]" />
                  <span>Siniestro (Rojo)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-[var(--risk-medium)]" />
                  <span>Siniestro (Amarillo)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estadisticas del Grafo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <FileWarning className="w-4 h-4" />
                  Siniestros
                </span>
                <span className="font-medium">{stats.siniestros}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Asegurados
                </span>
                <span className="font-medium">{stats.asegurados}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  Proveedores
                </span>
                <span className="font-medium">{stats.proveedores}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-[var(--risk-high)]" />
                  En Lista Restrictiva
                </span>
                <span className="font-medium text-[var(--risk-high)]">{stats.proveedoresEnLista}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conexiones</span>
                  <span className="font-medium">{stats.conexiones}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Con alerta</span>
                  <span className="font-medium text-[var(--risk-high)]">{stats.alertas}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Node Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Detalle del Nodo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    {selectedNode.type === 'asegurado' && <User className="w-4 h-4 text-[#60a5fa]" />}
                    {selectedNode.type === 'proveedor' && <Building2 className="w-4 h-4 text-[#fb923c]" />}
                    {selectedNode.type === 'siniestro' && <FileWarning className="w-4 h-4" style={{ color: selectedNode.color }} />}
                    <span className="font-medium">{selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}</span>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <div className="font-mono text-xs">{selectedNode.id}</div>
                    <div className="text-muted-foreground truncate">{selectedNode.label}</div>
                  </div>
                  {selectedNode.score !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <Badge style={{ backgroundColor: selectedNode.color }}>
                        {selectedNode.score}
                      </Badge>
                    </div>
                  )}
                  {selectedNode.riesgo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nivel</span>
                      <span style={{ color: RISK_COLORS[selectedNode.riesgo] }}>
                        {selectedNode.riesgo}
                      </span>
                    </div>
                  )}
                  {selectedNode.enLista !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lista Restrictiva</span>
                      <span className={selectedNode.enLista ? 'text-[var(--risk-high)]' : ''}>
                        {selectedNode.enLista ? 'Si' : 'No'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conexiones</span>
                    <span>{selectedNode.connections}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Haz clic en un nodo para ver sus detalles
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Los nodos mas grandes indican mayor numero de conexiones.
                Las lineas rojas representan conexiones con alertas de riesgo.
                Haz clic en cualquier nodo para ver sus conexiones.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          <strong>Nota importante:</strong> Esta visualizacion muestra relaciones para detectar patrones,
          NO implica acusaciones de fraude. Los clusters sospechosos requieren revision humana especializada.
        </p>
      </div>
    </div>
  )
}
