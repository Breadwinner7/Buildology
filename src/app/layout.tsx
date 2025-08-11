// app/layout.tsx
'use client'

import "@/app/globals.css"
import { Inter, JetBrains_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Topbar } from "@/components/layout/Topbar"
import { ClientOnly } from "@/components/shared/ClientOnly"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { SkipNavigation } from "@/lib/accessibility"
import QueryProvider from "@/components/providers/QueryProvider"

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
  return (
    <html 
      lang="en-GB" 
      suppressHydrationWarning
      className={cn(fontSans.variable, fontMono.variable)}
    >
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        "selection:bg-primary/20 selection:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}>
        <ClientOnly>
          <ErrorBoundary>
            <QueryProvider>
              <ThemeProvider 
                attribute="class" 
                defaultTheme="system" 
                enableSystem
                disableTransitionOnChange
              >
                <SkipNavigation />
                <div className="relative flex flex-col min-h-screen">
                  <Topbar />
                  <main id="main-content" className="flex-1" tabIndex={-1}>
                    {children}
                  </main>
                </div>

                <Toaster 
                  position="bottom-right"
                  toastOptions={{
                    duration: 4000,
                    className: "bg-background border-border text-foreground",
                  }}
                />
              </ThemeProvider>
            </QueryProvider>
          </ErrorBoundary>
        </ClientOnly>
      </body>
    </html>
  )
}
