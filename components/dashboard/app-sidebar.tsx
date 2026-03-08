"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Grid3X3,
  Users,
  Wallet,
  BarChart3,
  MessageSquare,
  CheckSquare,
  UserCircle2,
  Building2,
  Settings2,
  ReceiptText,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Menu,
  Sparkles,
  LogOut,
  ChevronDown,
  FolderKanban
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"

const primaryItems = [
  { icon: LayoutDashboard, label: "Panel", href: "/clubos/dashboard" },
  { icon: Calendar, label: "Reservas", href: "/clubos/dashboard/reservas" },
  { icon: Grid3X3, label: "Canchas", href: "/clubos/dashboard/courts" },
  { icon: Users, label: "Clientes", href: "/clubos/dashboard/customers" },
  { icon: Wallet, label: "Finanzas", href: "/clubos/dashboard/finanzas" },
  { icon: BarChart3, label: "Reportes", href: "/clubos/dashboard/reportes" },
]

const gestionItems = [
  { icon: MessageSquare, label: "Mensajes", href: "/clubos/dashboard/messages" },
  { icon: CheckSquare, label: "Tareas", href: "/clubos/dashboard/tasks" },
]

const configItems = [
  { icon: UserCircle2, label: "Mi cuenta", href: "/clubos/dashboard/settings/profile" },
  { icon: Building2, label: "Centro", href: "/clubos/dashboard/settings/center" },
  { icon: Settings2, label: "Operación", href: "/clubos/dashboard/settings/operacion" },
  { icon: ReceiptText, label: "Cobros y facturación", href: "/clubos/dashboard/settings/facturacion" },
  { icon: Bell, label: "Notificaciones", href: "/clubos/dashboard/settings/notificaciones" },
  { icon: ShieldCheck, label: "Equipo y permisos", href: "/clubos/dashboard/settings/team" },
  { icon: LifeBuoy, label: "Ayuda", href: "/clubos/dashboard/settings/help" },
]

export function AppSidebar() {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [gestionOpen, setGestionOpen] = useState(pathname.startsWith("/clubos/dashboard/messages") || pathname.startsWith("/clubos/dashboard/tasks"))
  const [configOpen, setConfigOpen] = useState(pathname.startsWith("/clubos/dashboard/settings"))

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
      await signOut(auth)
      router.push("/clubos/login")
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isActiveRoute = (href: string) => {
    if (href === "/clubos/dashboard") {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    if (pathname.startsWith("/clubos/dashboard/messages") || pathname.startsWith("/clubos/dashboard/tasks")) {
      setGestionOpen(true)
    }
    if (pathname.startsWith("/clubos/dashboard/settings")) {
      setConfigOpen(true)
    }
  }, [pathname])

  const displayName = user?.displayName || "Admin del club"
  const displayEmail = user?.email || "admin@club.com"
  const initial = (displayName?.[0] || displayEmail?.[0] || "A").toUpperCase()

  return (
    <div className="flex flex-col h-screen w-64 border-r bg-card/50 hidden md:flex sticky top-0">
      <div className="p-6">
        <Link
          href="/clubos/dashboard"
          className="text-xl font-bold tracking-tight flex items-center gap-2 text-black"
          aria-label="Ir al dashboard de ClubOS"
        >
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-5 text-primary" />
          </div>
          <span>courtly</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {primaryItems.map((item) => {
          const isActive = isActiveRoute(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-black",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}

        <div className="my-3 border-t border-slate-200" />

        <button
          type="button"
          onClick={() => setGestionOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
        >
          <span className="inline-flex items-center gap-2">
            <FolderKanban className="size-3.5" />
            Gestión
          </span>
          <ChevronDown className={cn("size-4 transition-transform", gestionOpen ? "rotate-180" : "")}/>
        </button>
        {gestionOpen && (
          <div className="space-y-1 pl-2">
            {gestionItems.map((item) => {
              const isActive = isActiveRoute(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-black",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setConfigOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 mt-2"
        >
          <span className="inline-flex items-center gap-2">
            <UserCircle2 className="size-3.5" />
            Configuración
          </span>
          <ChevronDown className={cn("size-4 transition-transform", configOpen ? "rotate-180" : "")}/>
        </button>
        {configOpen && (
          <div className="space-y-1 pl-2">
            {configItems.map((item) => {
              const isActive = isActiveRoute(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-black",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 text-black mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="size-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
            {initial}
          </div>
          <div className="text-sm min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4 mr-2" />
          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </Button>
      </div>
    </div>
  )
}

export function MobileSidebar() {
    const { user } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [gestionOpen, setGestionOpen] = useState(pathname.startsWith("/clubos/dashboard/messages") || pathname.startsWith("/clubos/dashboard/tasks"))
    const [configOpen, setConfigOpen] = useState(pathname.startsWith("/clubos/dashboard/settings"))

    const handleLogout = async () => {
      if (isLoggingOut) return
      setIsLoggingOut(true)
      try {
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "include",
        })
        await signOut(auth)
        setOpen(false)
        router.push("/clubos/login")
        router.refresh()
      } finally {
        setIsLoggingOut(false)
      }
    }

    const isActiveRoute = (href: string) => {
      if (href === "/clubos/dashboard") {
        return pathname === href
      }
      return pathname === href || pathname.startsWith(`${href}/`)
    }

    useEffect(() => {
      if (pathname.startsWith("/clubos/dashboard/messages") || pathname.startsWith("/clubos/dashboard/tasks")) {
        setGestionOpen(true)
      }
      if (pathname.startsWith("/clubos/dashboard/settings")) {
        setConfigOpen(true)
      }
    }, [pathname])

    const displayName = user?.displayName || "Admin del club"
    const displayEmail = user?.email || "admin@club.com"
    const initial = (displayName?.[0] || displayEmail?.[0] || "A").toUpperCase()

    return (
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
               <Link href="/clubos/dashboard" className="flex items-center gap-2 font-bold text-lg text-black" aria-label="Ir al dashboard de ClubOS">
                 <Sparkles className="size-5 text-primary" />
                 courtly
               </Link>
            {/* Simple Sheet implementation or just a trigger for now if Sheet is not available, 
                checking UI library again... Sheet wasn't there. 
                I'll handle mobile nav simply for now to avoid errors. 
            */}
             <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
                 <Menu className="size-5" />
             </Button>
             
             {open && (
                 <div className="absolute top-16 left-0 right-0 bg-background border-b z-50 shadow-lg animate-in slide-in-from-top-5">
                     <nav className="flex flex-col p-4 space-y-2">
                  {primaryItems.map((item) => (
                             <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-black",
                                  isActiveRoute(item.href)
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted"
                                )}
                             >
                                <item.icon className="size-4" />
                                {item.label}
                             </Link>
                        ))}

                        <div className="my-1 border-t border-slate-200" />

                        <button
                          type="button"
                          onClick={() => setGestionOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          <span className="inline-flex items-center gap-2">
                            <FolderKanban className="size-3.5" /> Gestión
                          </span>
                          <ChevronDown className={cn("size-4 transition-transform", gestionOpen ? "rotate-180" : "")}/>
                        </button>
                        {gestionOpen && (
                          <div className="space-y-1 pl-2">
                            {gestionItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-black",
                                  isActiveRoute(item.href) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                )}
                              >
                                <item.icon className="size-4" />
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfigOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          <span className="inline-flex items-center gap-2">
                            <UserCircle2 className="size-3.5" /> Configuración
                          </span>
                          <ChevronDown className={cn("size-4 transition-transform", configOpen ? "rotate-180" : "")}/>
                        </button>
                        {configOpen && (
                          <div className="space-y-1 pl-2">
                            {configItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-black",
                                  isActiveRoute(item.href) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                )}
                              >
                                <item.icon className="size-4" />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="justify-start mt-2"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                        >
                          <LogOut className="size-4 mr-2" />
                          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                        </Button>
                     </nav>
                 </div>
             )}
        </div>
    )
}
