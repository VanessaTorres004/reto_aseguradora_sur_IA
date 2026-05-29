# 🔐 Guía de Seguridad - Fraud Detection System

## Mejoras de Seguridad Implementadas

### 1. **Autenticación**
- ✅ Sistema de login con tokens de sesión
- ✅ Protección de endpoints con autenticación
- ✅ Sesiones que expiran en 24 horas
- ℹ️ Para producción: integrar con NextAuth.js + Google OAuth

### 2. **Enmascaramiento de PII (Información Personal Identificable)**

Los datos sensibles se ocultan según el rol del usuario:

#### Roles disponibles:
- **AUDITOR**: Acceso completo (ver todos los datos sin enmascarar)
- **ANALYST**: Acceso modificado (datos básicos enmascarados)
- **VIEWER**: Acceso limitado (máximo enmascaramiento)

#### Datos enmascarados:
- Documentos: `"1234567890"` → `"****7890"`
- Nombres: `"Juan García"` → `"J. G."`
- Teléfonos: `"+51 987654321"` → `"****4321"`
- Emails: `"user@example.com"` → `"u***@example.com"`
- Direcciones: Se muestra solo la primera línea
- Fechas de nacimiento: Siempre protegidas
- Placas: `"ABC-1234"` → `"ABC-****"`

### 3. **Auditoría y Logging**

Todas las acciones se registran:
```
- Quién accedió (userId, email)
- Qué hizo (acción)
- Cuándo (timestamp)
- A qué recurso (resource ID)
- Con qué resultado (SUCCESS/FAILED)
- Nivel de riesgo (LOW/MEDIUM/HIGH)
```

Disponible en: `GET /api/audit/logs`

### 4. **Autorización basada en Roles**

#### Permisos por rol:
| Acción | AUDITOR | ANALYST | VIEWER |
|--------|---------|---------|--------|
| Ver casos | ✅ | ✅ | ✅ |
| Ver datos PII | ✅ | ⚠️ (enmascarado) | ⚠️ (enmascarado) |
| Modificar datos | ✅ | ✅ | ❌ |
| Exportar auditoría | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |

---

## 🚀 Cómo Usar

### 1. **Login**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "auditor@aseguradora.com",
  "password": "demo123"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "user": {
    "id": "user_1234567890",
    "email": "auditor@aseguradora.com",
    "name": "Auditor Jefe",
    "role": "AUDITOR"
  },
  "token": "session_1234567890_abc123",
  "expiresAt": "2024-01-31T10:00:00Z"
}
```

### 2. **Usar el Token en Requests**

```bash
GET /api/siniestros?nivelRiesgo=ROJO
Authorization: Bearer session_1234567890_abc123
```

### 3. **Obtener Logs de Auditoría**

```bash
# Solo AUDITOR puede hacer esto
GET /api/audit/logs?format=json&limit=100
Authorization: Bearer session_auditor_token
```

---

## 👥 Usuarios de Prueba

| Email | Contraseña | Rol | Permisos |
|-------|-----------|-----|----------|
| `auditor@aseguradora.com` | `demo123` | AUDITOR | Acceso total + Auditoría |
| `analista@aseguradora.com` | `demo123` | ANALYST | Ver + Modificar (datos enmascarados) |
| `usuario@aseguradora.com` | `demo123` | VIEWER | Solo lectura (máximo enmascaramiento) |

---

## 📊 Rutas Protegidas

| Endpoint | Método | Requiere Auth | Requiere Rol |
|----------|--------|---------------|--------------|
| `/api/auth/login` | POST | ❌ | - |
| `/api/siniestros` | GET | ✅ | Cualquiera |
| `/api/proveedores` | GET | ✅ | Cualquiera |
| `/api/analizar` | POST | ✅ | ANALYST+ |
| `/api/audit/logs` | GET | ✅ | AUDITOR |
| `/api/chat` | POST | ✅ | Cualquiera |

---

## 🔄 Próximos Pasos para Producción

### Fase 1: Implementación Completa
- [ ] Instalar y configurar NextAuth.js
- [ ] Integrar con Google OAuth / Azure AD
- [ ] Implementar 2FA (autenticación de dos factores)
- [ ] Rate limiting en endpoints

### Fase 2: Persistencia
- [ ] Guardar logs de auditoría en BD (PostgreSQL)
- [ ] Implementar encriptación de datos sensibles (AES-256)
- [ ] Backup automático de logs

### Fase 3: Compliance
- [ ] Implementar GDPR (derecho al olvido)
- [ ] Auditoría de acceso a PII
- [ ] Política de retención de datos
- [ ] Enmascaramiento automático en reportes

### Fase 4: Monitoreo
- [ ] Alertas para acceso anómalo
- [ ] Dashboard de seguridad
- [ ] Análisis de patrones de acceso

---

## 🛡️ Mejores Prácticas

1. **Nunca compartir tokens**: Los tokens son personales
2. **Usar HTTPS**: Siempre en producción
3. **Renovar sesiones**: Cerrar sesión cuando no se use
4. **Auditar regularmente**: Revisar logs de acceso
5. **Enmascarar PII**: Configurar nivel según rol
6. **Validar en backend**: Nunca confiar en el cliente

---

## 📝 Ejemplo de Uso en React

```tsx
import { useAuth, useProtectedFetch } from '@/hooks/use-auth'

export function CasesTable() {
  const { isAuthenticated, user } = useAuth()
  const { data, loading, fetchData } = useProtectedFetch('/api/siniestros')

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div>
      <h2>Casos (viendo como {user?.role})</h2>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Cargando...' : 'Cargar Casos'}
      </button>
      {/* Mostrar datos con enmascaramiento según rol */}
    </div>
  )
}
```

---

## 🚨 Niveles de Riesgo en Auditoría

- **LOW**: Lectura de datos (menos crítico)
- **MEDIUM**: Modificación, login fallido
- **HIGH**: Acceso denegado, token inválido, error de servidor

---

## 📞 Soporte

Para reportar vulnerabilidades de seguridad, contactar al equipo de infraestructura.
