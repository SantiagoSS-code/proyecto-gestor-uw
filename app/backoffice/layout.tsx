"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BackofficeShell } from "@/components/backoffice/backoffice-shell"
import { BackofficeAuthProvider, useBackofficeAuth } from "@/lib/backoffice/auth-context"

function BackofficeGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useBackofficeAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLogin = pathname === "/backoffice/login"

  useEffect(() => {
    if (!loading && !user && !isLogin) {
      router.replace("/backoffice/login")
    }
  }, [loading, user, isLogin, router])

  if (isLogin) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading backoffice…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Redirecting…</div>
      </div>
    )
  }

  return <BackofficeShell>{children}</BackofficeShell>
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <BackofficeAuthProvider>
      <BackofficeGuard>{children}</BackofficeGuard>
    </BackofficeAuthProvider>
  )
}
