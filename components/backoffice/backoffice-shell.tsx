"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { signOut } from "firebase/auth"
import { useBackofficeAuth } from "@/lib/backoffice/auth-context"
import { backofficeFetch } from "@/lib/backoffice/client"
import { authBackoffice } from "@/lib/firebaseBackofficeClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sparkles, LayoutDashboard, Users, Building2, Grid2X2, CalendarClock, CreditCard, LifeBuoy } from "lucide-react"

const nav = [
  { href: "/backoffice", label: "Overview", icon: LayoutDashboard },
  { href: "/backoffice/players", label: "Players", icon: Users },
  { href: "/backoffice/centers", label: "Centers/Clubs", icon: Building2 },
  { href: "/backoffice/courts", label: "Courts", icon: Grid2X2 },
  { href: "/backoffice/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/backoffice/payments", label: "Payments", icon: CreditCard },
  { href: "/backoffice/support", label: "Support/Reports", icon: LifeBuoy, disabled: true },
] as const

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useBackofficeAuth()
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [roleLoading, setRoleLoading] = useState(true)
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      if (!user) return
      try {
        await backofficeFetch<{ ok: true }>("/api/backoffice/me")
        setIsPlatformAdmin(true)
        setRoleError(null)
      } catch (error: any) {
        setIsPlatformAdmin(false)
        const message = error?.message || "Forbidden"
        setRoleError(message)
      } finally {
        setRoleLoading(false)
      }
    }

    if (!loading && user) check()
    if (!loading && !user) setRoleLoading(false)
  }, [loading, user])

  const gate = useMemo(() => {
    if (loading || roleLoading) {
      return <div className="min-h-[50vh] flex items-center justify-center text-slate-600">Loading…</div>
    }

    if (!user) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
          <div className="text-slate-900 font-semibold">Sign in required</div>
          <div className="text-slate-600 text-sm">You must sign in to access the back office.</div>
          <Link href="/backoffice/login">
            <Button className="bg-blue-600 hover:bg-blue-700">Go to login</Button>
          </Link>
        </div>
      )
    }

    if (!isPlatformAdmin) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
          <div className="text-slate-900 font-semibold">403 — Forbidden</div>
          <div className="text-slate-600 text-sm">This area is restricted to platform admins.</div>
          {process.env.NODE_ENV === "development" && roleError ? (
            <div className="mt-3 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {roleError}
            </div>
          ) : null}
          <Button
            variant="outline"
            onClick={async () => {
              await signOut(authBackoffice)
              await fetch("/api/auth/session", { method: "DELETE", credentials: "include" }).catch(() => null)
              router.replace("/backoffice/login")
            }}
            className="mt-2"
          >
            Sign out
          </Button>
        </div>
      )
    }

    return null
  }, [isPlatformAdmin, loading, roleError, roleLoading, router, user])

  if (gate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-10">{gate}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 h-fit">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-lg tracking-tight text-slate-900">courtly</div>
                <div className="text-xs text-slate-600">Back Office</div>
              </div>
            </Link>

            <nav className="space-y-1">
              {nav.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const disabled = !!(item as any).disabled

                return (
                  <Link
                    key={item.href}
                    href={disabled ? "#" : item.href}
                    aria-disabled={disabled}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      disabled && "opacity-50 pointer-events-none",
                      isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await signOut(authBackoffice)
                  await fetch("/api/auth/session", { method: "DELETE", credentials: "include" }).catch(() => null)
                  router.replace("/backoffice/login")
                }}
              >
                Sign out
              </Button>
            </div>
          </aside>

          <section className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6">
            {children}
          </section>
        </div>
      </div>
    </div>
  )
}
