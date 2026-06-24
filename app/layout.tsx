import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OutreachIQ - Smart Executive Connection Strategy',
  description: 'AI-powered strategies to connect with executives',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-600">🎯 OutreachIQ</h1>
            <p className="text-gray-600">Smart Strategy to Connect with Executives</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  )
}
