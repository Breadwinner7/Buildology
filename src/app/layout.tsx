// app/layout.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import "@/app/globals.css"
import { Inter, JetBrains_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Topbar } from "@/components/layout/Topbar"
import { ClientOnly } from "@/components/shared/ClientOnly"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

const fontSans = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: 'swap',
})

const fontMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <html 
      lang="en-GB" 
      suppressHydrationWarning
      className={cn(fontSans.variable, fontMono.variable)}
    >
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        "selection:bg-primary/20 selection:text-primary"
      )}>
        <ClientOnly>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider 
                attribute="class" 
                defaultTheme="system" 
                enableSystem
                disableTransitionOnChange
              >
                <div className="relative flex min-h-screen flex-col">
                  <Topbar />
                  <main className="flex-1">
                    {children}
                  </main>

                  <Toaster 
                    position="bottom-right"
                    toastOptions={{
                      duration: 4000,
                      className: "bg-background border-border text-foreground",
                    }}
                  />
                </div>
              </ThemeProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ClientOnly>
      </body>
    </html>
  )
}
