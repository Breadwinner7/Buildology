// app/layout.tsx
import type { Metadata, Viewport } from "next"
import "@/app/globals.css"
import { Inter, JetBrains_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { ConditionalTopbar } from "@/components/layout/ConditionalTopbar"
import { Toaster } from "sonner"
import { PageErrorBoundary } from "@/components/ui/error-boundary"
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

export const metadata: Metadata = {
  title: {
    default: "Buildology - Insurance Claims Management",
    template: "%s | Buildology",
  },
  description: "Professional insurance claims management system for the UK market",
  keywords: ["insurance", "claims", "management", "UK", "property", "construction"],
  authors: [{ name: "Buildology Team" }],
  creator: "Buildology",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://buildology.co.uk",
    siteName: "Buildology",
    title: "Buildology - Insurance Claims Management",
    description: "Professional insurance claims management system for the UK market",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildology",
    description: "Professional insurance claims management system",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        <PageErrorBoundary>
          <QueryProvider>
            <ThemeProvider 
              attribute="class" 
              defaultTheme="light" 
              enableSystem={true}
              disableTransitionOnChange={false}
              storageKey="buildology-theme"
            >
              <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded">
                Skip to main content
              </a>
              <div className="relative flex flex-col min-h-screen">
                <ConditionalTopbar />
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
        </PageErrorBoundary>
      </body>
    </html>
  )
}