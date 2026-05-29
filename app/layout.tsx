
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'

import { AuthGuard } from '@/components/auth-guard'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Sistema Antifraude | Aseguradora del Sur | She Codes',

  description:
    'Detector de Posibles Fraudes en Siniestros - hackIAthon 2026',

  generator: 'v0.app',

  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],

    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (

    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} dark bg-background`}
    >

      <body className="font-sans antialiased">

        <AuthGuard>
          {children}
        </AuthGuard>

        {process.env.NODE_ENV === 'production' && (
          <Analytics />
        )}

      </body>

    </html>
  )
}

