import type { UploadedCase } from '@/lib/fraud-analyzer'

const STORAGE_KEY = 'antifraude_uploaded_cases'
const EVENT_NAME = 'uploaded-cases-changed'

function dispatchUploadedCasesChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(EVENT_NAME))
}

function normalizeUploadedCase(uploadedCase: UploadedCase): UploadedCase {
  return {
    ...uploadedCase,
    uploadedAt: new Date(uploadedCase.uploadedAt),
  }
}

export function getUploadedCases(): UploadedCase[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map(normalizeUploadedCase)
  } catch (error) {
    console.error('Error leyendo casos subidos:', error)
    return []
  }
}

export function saveUploadedCases(cases: UploadedCase[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
    dispatchUploadedCasesChanged()
  } catch (error) {
    console.error('Error guardando casos subidos:', error)
  }
}

export function addUploadedCase(uploadedCase: UploadedCase) {
  const currentCases = getUploadedCases()

  const alreadyExists = currentCases.some(
    item => item.id === uploadedCase.id
  )

  const updatedCases = alreadyExists
    ? currentCases.map(item =>
        item.id === uploadedCase.id ? uploadedCase : item
      )
    : [uploadedCase, ...currentCases]

  saveUploadedCases(updatedCases)
}

export function removeUploadedCase(id: string) {
  const currentCases = getUploadedCases()

  const updatedCases = currentCases.filter(
    item => item.id !== id
  )

  saveUploadedCases(updatedCases)
}

export function clearUploadedCases() {
  saveUploadedCases([])
}

export function subscribeToUploadedCases(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = () => {
    listener()
  }

  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener('storage', handler)

  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', handler)
  }
}