/**
 * Sistema de Auditoría y Logging
 * Registra acciones críticas para trazabilidad
 */

export type AuditAction =
  | 'VIEW_CASE'
  | 'ANALYZE_DOCUMENT'
  | 'VIEW_PROVIDER'
  | 'EXPORT_REPORT'
  | 'CHAT_MESSAGE'
  | 'FILTER_CASES'
  | 'LOGIN'
  | 'LOGOUT'

export interface AuditLog {
  id: string
  timestamp: Date
  userId: string
  userEmail: string
  action: AuditAction
  resource: string // ID del recurso accedido
  details: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  status: 'SUCCESS' | 'FAILED'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

// En una aplicación real, esto iría a una base de datos
// Por ahora, guardamos en memoria con un límite de 10k registros
const auditLogs: AuditLog[] = []
const MAX_LOGS = 10000

/**
 * Registra una acción de auditoría
 */
export function logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const auditLog: AuditLog = {
    ...event,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    timestamp: new Date(),
  }

  auditLogs.push(auditLog)

  // Mantener límite de registros
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.shift()
  }

  // En desarrollo, loguear en consola
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', {
      action: auditLog.action,
      user: auditLog.userEmail,
      resource: auditLog.resource,
      status: auditLog.status,
      risk: auditLog.riskLevel,
    })
  }

  return auditLog
}

/**
 * Obtiene logs de auditoría filtrados (solo para administradores)
 */
export function getAuditLogs(
  filter?: {
    userId?: string
    action?: AuditAction
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
    since?: Date
  }
): AuditLog[] {
  let result = [...auditLogs]

  const userId = filter?.userId
  const action = filter?.action
  const riskLevel = filter?.riskLevel
  const since = filter?.since

  if (userId) {
    result = result.filter((log) => log.userId === userId)
  }

  if (action) {
    result = result.filter((log) => log.action === action)
  }

  if (riskLevel) {
    result = result.filter((log) => log.riskLevel === riskLevel)
  }

  if (since) {
    result = result.filter((log) => log.timestamp >= since)
  }

  return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

/**
 * Exporta logs de auditoría en formato CSV
 */
export function exportAuditLogsAsCSV(): string {
  const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'Risk Level']

  const rows = auditLogs.map((log) => [
    log.timestamp.toISOString(),
    log.userEmail,
    log.action,
    log.resource,
    log.status,
    log.riskLevel,
  ])

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n')

  return csv
}

/**
 * Limpia logs antiguos (ejecutar periódicamente)
 */
export function cleanOldAuditLogs(days: number = 90): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const initialLength = auditLogs.length
  const filtered = auditLogs.filter((log) => log.timestamp > cutoffDate)

  auditLogs.length = 0
  auditLogs.push(...filtered)

  return initialLength - auditLogs.length
}

/**
 * Obtiene estadísticas de auditoría
 */
export function getAuditStats() {
  const stats = {
    totalLogs: auditLogs.length,
    uniqueUsers: new Set(auditLogs.map((log) => log.userId)).size,
    actionCounts: {} as Record<AuditAction, number>,
    riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    last24Hours: 0,
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  for (const log of auditLogs) {
    stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1
    stats.riskDistribution[log.riskLevel]++

    if (log.timestamp > oneDayAgo) {
      stats.last24Hours++
    }
  }

  return stats
}
