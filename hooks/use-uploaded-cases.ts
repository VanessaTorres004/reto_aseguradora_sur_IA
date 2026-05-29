'use client'

import { useEffect, useState } from 'react'
import type { UploadedCase } from '@/lib/fraud-analyzer'
import {
  getUploadedCases,
  subscribeToUploadedCases
} from '@/lib/uploaded-cases-store'

export function useUploadedCases() {
  const [uploadedCases, setUploadedCases] = useState<UploadedCase[]>([])

  useEffect(() => {
    setUploadedCases(getUploadedCases())

    const unsubscribe = subscribeToUploadedCases(() => {
      setUploadedCases(getUploadedCases())
    })

    return unsubscribe
  }, [])

  return uploadedCases
}