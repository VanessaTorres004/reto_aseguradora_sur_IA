'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileSearch,
  BarChart3,
  MessageSquare,
  Network,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  Building2,
  Upload,
  Brain,
  TrendingDown,
  Code2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dashboardStats } from '@/lib/data'
import { useUploadedCases } from '@/hooks/use-uploaded-cases'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Bandeja de Casos', href: '/casos', icon: FileSearch },
  { name: 'Chat con Casos', href: '/chat', icon: Brain },
  { name: 'Subir Documentos', href: '/subir', icon: Upload },
  { name: 'Proveedores', href: '/proveedores', icon: Building2 },
  { name: 'Analitica', href: '/analitica', icon: BarChart3 },
  { name: 'Agente IA', href: '/agente', icon: MessageSquare },
  { name: 'Red de Relaciones', href: '/red', icon: Network },
  { name: 'Simulacion Ahorro', href: '/simulacion', icon: TrendingDown },
  { name: 'API Docs', href: '/api/analizar', icon: Code2 },
]

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const uploadedCases = useUploadedCases()

  const totalCasos = dashboardStats.totalSiniestros + uploadedCases.length

  const casosRojosSubidos = uploadedCases.filter(
    uploadedCase => uploadedCase.analysis?.nivelRiesgo === 'ROJO'
  ).length

  const totalCasosRojos = dashboardStats.casosRojos + casosRojosSubidos

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>

            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  AntiFraude
                </span>
                <span className="text-xs text-muted-foreground">
                  Aseguradora del Sur
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Stats Summary */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 text-[var(--risk-high)]" />
                  Casos Rojos
                </span>
                <span className="font-medium text-[var(--risk-high)]">
                  {totalCasosRojos}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  Total Casos
                </span>
                <span className="font-medium">
                  {totalCasos}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4 text-[var(--risk-medium)]" />
                  Prov. en Lista
                </span>
                <span className="font-medium text-[var(--risk-medium)]">
                  {dashboardStats.proveedoresEnLista}
                </span>
              </div>

              {uploadedCases.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Casos cargados
                    </span>
                    <span className="font-semibold text-primary">
                      +{uploadedCases.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapse Button */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}