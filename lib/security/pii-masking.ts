/**
 * Utilidades para enmascaramiento de Información Personal Identificable (PII)
 * Protege datos sensibles como documentos, nombres, teléfonos, etc.
 */

/**
 * Enmascara un número de documento (RUC, CI, etc)
 * Ejemplo: "1234567890" → "****7890"
 */
export function maskDocument(document: string): string {
  if (!document || document.length < 4) return '****'
  return '*'.repeat(document.length - 4) + document.slice(-4)
}

/**
 * Enmascara un nombre
 * Ejemplo: "Juan García" → "J. G."
 */
export function maskName(name: string): string {
  if (!name) return 'N/A'
  const parts = name.trim().split(' ')
  return parts.map(part => part[0].toUpperCase() + '.').join(' ')
}

/**
 * Enmascara un teléfono
 * Ejemplo: "+51 987654321" → "+51 ****4321"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****'
  const cleaned = phone.replace(/\D/g, '')
  const lastFour = cleaned.slice(-4)
  return `****${lastFour}`
}

/**
 * Enmascara un email
 * Ejemplo: "user@example.com" → "u***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email) return 'N/A'
  const [user, domain] = email.split('@')
  if (!user || !domain) return 'N/A'
  return user[0] + '*'.repeat(user.length - 1) + '@' + domain
}

/**
 * Enmascara una dirección
 * Ejemplo: "Av. Principal 123, Apt 45" → "Av. Principal..."
 */
export function maskAddress(address: string): string {
  if (!address) return 'N/A'
  const parts = address.split(',')
  return (parts[0] || 'N/A') + (parts.length > 1 ? ', ...' : '')
}

/**
 * Enmascara una placa vehicular
 * Ejemplo: "ABC-1234" → "ABC-****"
 */
export function maskPlate(plate: string): string {
  if (!plate || plate.length < 3) return '****'
  const letters = plate.split('-')[0] || '***'
  return letters + '-****'
}

/**
 * Enmascara fecha de nacimiento (no la muestra si el usuario no tiene rol especial)
 * Ejemplo: "1990-05-15" → "Protegido"
 */
export function maskDateOfBirth(date: string): string {
  // En una versión real, solo mostrar si el usuario tiene permisos
  return 'Protegido'
}

/**
 * Máscara genérica de PII
 * Ejemplo: "SensitiveData123" → "****Data123"
 */
export function maskGeneric(value: string, showChars: number = 4): string {
  if (!value || value.length <= showChars) return '*'.repeat(value.length)
  return '*'.repeat(value.length - showChars) + value.slice(-showChars)
}

/**
 * Objeto de configuración para enmascarar datos según nivel de exposición
 */
export const PII_MASK_CONFIG = {
  // NIVEL 1: Solo información no sensible
  PUBLIC: {
    nombre: true,
    documento: true,
    telefono: true,
    email: true,
    direccion: true,
    fechaNacimiento: true,
    placa: true,
  },
  // NIVEL 2: Usuario autenticado
  AUTHENTICATED: {
    nombre: false, // Muestra
    documento: true, // Enmascara
    telefono: true,
    email: true,
    direccion: false,
    fechaNacimiento: true,
    placa: true,
  },
  // NIVEL 3: Auditor/Especialista
  AUDITOR: {
    nombre: false,
    documento: false,
    telefono: false,
    email: false,
    direccion: false,
    fechaNacimiento: false,
    placa: false,
  },
}

export type MaskLevel = keyof typeof PII_MASK_CONFIG

/**
 * Aplica máscara a un objeto según su nivel de acceso
 */
export function applyMaskingByLevel(
  data: Record<string, any>,
  level: MaskLevel = 'PUBLIC'
): Record<string, any> {
  const config = PII_MASK_CONFIG[level]
  const masked = { ...data }

  if (data.nombre && config.nombre) masked.nombre = maskName(data.nombre)
  if (data.documento && config.documento) masked.documento = maskDocument(data.documento)
  if (data.telefono && config.telefono) masked.telefono = maskPhone(data.telefono)
  if (data.email && config.email) masked.email = maskEmail(data.email)
  if (data.direccion && config.direccion) masked.direccion = maskAddress(data.direccion)
  if (data.fechaNacimiento && config.fechaNacimiento) masked.fechaNacimiento = maskDateOfBirth(data.fechaNacimiento)
  if (data.placa && config.placa) masked.placa = maskPlate(data.placa)
  if (data.documento && config.documento) masked.documento = maskDocument(data.documento)

  return masked
}
