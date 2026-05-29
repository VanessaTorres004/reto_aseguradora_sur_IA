'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

interface ConditionalSidebarProps {
  children: React.ReactNode
}

export function ConditionalSidebar({ children }: ConditionalSidebarProps) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  return <Sidebar>{children}</Sidebar>
}
