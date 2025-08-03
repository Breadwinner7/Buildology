// app/layout.tsx
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

export const metadata = {
  title: {
    default: "Buildology",
    template: "%s | Buildology"
  },
  description: "Professional Project & Claims Management for the UK Building Industry",
  keywords: ["construction", "building", "project management", "claims", "UK"],
  authors: [{ name: "Buildology" }],
  creator: "Buildology",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    title: "Buildology",
    description: "Professional Project & Claims Management for the UK Building Industry",
    siteName: "Buildology",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildology",
    description: "Professional Project & Claims Management for the UK Building Industry",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
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
                
                {/* Toast notifications */}
                <Toaster 
                  position="bottom-right"
                  toastOptions={{
                    duration: 4000,
                    className: "bg-background border-border text-foreground",
                  }}
                />
              </div>
            </ThemeProvider>
          </ErrorBoundary>
        </ClientOnly>
      </body>
    </html>
  )
}