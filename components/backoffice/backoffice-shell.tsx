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
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Grid2X2,
  CalendarClock,
  CreditCard,
  LifeBuoy,
} from "lucide-react"
import { VoydLogo } from "@/components/ui/voyd-logo"

// ─── Navigation structure ────────────────────────────────────────────────────
// Groups are purely visual — all actual routes are preserved.

type NavGroup = { kind: "group"; label: string }
type NavItem  = { kind: "item"; href: string; label: string; icon: any; isActive?: (p: string) => boolean }
type NavEntry = NavGroup | NavItem

const NAV: NavEntry[] = [
  { kind: "item", href: "/backoffice",          label: "Dashboard", icon: LayoutDashboard },

  { kind: "group", label: "Operations" },
  { kind: "item", href: "/backoffice/bookings", label: "Bookings",  icon: CalendarClock },

  { kind: "group", label: "Entities" },
  { kind: "item", href: "/backoffice/players",  label: "Players",   icon: Users },
  { kind: "item", href: "/backoffice/users",    label: "Users",     icon: UserPlus },
  {
    kind: "item",
    href: "/backoffice/centers",
    label: "Clubs",
    icon: Building2,
    // also highlight on /backoffice/clubs if we ever add it
    isActive: (p) => p.startsWith("/backoffice/centers"),
  },
  { kind: "item", href: "/backoffice/courts",   label: "Courts",    icon: Grid2X2 },

  { kind: "group", label: "Finance" },
  { kind: "item", href: "/backoffice/payments", label: "Payments",  icon: CreditCard },

  { kind: "group", label: "Support" },
  { kind: "item", href: "/backoffice/reports",  label: "Reports",   icon: LifeBuoy },
]

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">

          {/* ── Sidebar ── */}
          <aside className="lg:sticky lg:top-6 lg:self-start bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 h-fit">
            {/* Brand */}
            <Link href="/backoffice" className="flex flex-col gap-1 mb-5 px-1">
              <VoydLogo className="h-7" />
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Admin Console</div>
            </Link>

            {/* Nav */}
            <nav className="space-y-0.5">
              {NAV.map((entry, idx) => {
                if (entry.kind === "group") {
                  return (
                    <div key={`group-${idx}`} className="pt-3 pb-1 px-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {entry.label}
                      </p>
                    </div>
                  )
                }

                const isActive = entry.isActive
                  ? entry.isActive(pathname)
                  : pathname === entry.href
                const Icon = entry.icon

                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {entry.label}
                  </Link>
                )
              })}
            </nav>

            {/* Sign out */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                onClick={async () => {
                  await signOut(authBackoffice)
                  await fetch("/api/auth/session", { method: "DELETE", credentials: "include" }).catch(() => null)
                  router.replace("/backoffice/login")
                }}
                className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6 min-h-[calc(100vh-3rem)]">
            {children}
          </main>

        </div>
      </div>
    </div>
  )
}
