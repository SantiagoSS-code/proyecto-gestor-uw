import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _playfair = Playfair_Display({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Voyd ",
  description:
    "AI-powered court booking that understands you. Intelligent scheduling, predictive matching, and seamless reservations for the modern player.",
  generator: "v0.app",
  icons: {
    icon: "/images/voyd-logo-new-cropped.png",
    apple: "/images/voyd-logo-new-cropped.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#e87d4e",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${_inter.className}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
