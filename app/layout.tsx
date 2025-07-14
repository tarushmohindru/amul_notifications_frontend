import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amul Notifications',
  description: 'Get notified about Amul protein products availability',
  authors: [
    {
      name: "Tarush Mohindru"
    }
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
