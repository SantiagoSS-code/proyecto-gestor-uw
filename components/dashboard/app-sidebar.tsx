"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Grid3X3,
  Users,
  DollarSign,
  BarChart3,
  MessageSquare,
  CheckSquare,
  CreditCard,
  Bell,
  Settings,
  Menu,
  Sparkles,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"

const sidebarItems = [
  { icon: LayoutDashboard, label: "Panel", href: "/clubos/dashboard" },
  { icon: Calendar, label: "Reservas", href: "/clubos/dashboard/reservas" },
  { icon: Grid3X3, label: "Canchas", href: "/clubos/dashboard/courts" },
  { icon: Users, label: "Clientes", href: "/clubos/dashboard/customers" },
  { icon: DollarSign, label: "Ingresos", href: "/clubos/dashboard/revenue" },
  { icon: BarChart3, label: "Analíticas", href: "/clubos/dashboard/analytics" },
  { icon: MessageSquare, label: "Mensajes", href: "/clubos/dashboard/messages" },
  { icon: CheckSquare, label: "Tareas", href: "/clubos/dashboard/tasks" },
  { icon: CreditCard, label: "Facturación", href: "/clubos/dashboard/billing" },
  { icon: Bell, label: "Notificaciones", href: "/clubos/dashboard/notifications" },
  { icon: Settings, label: "Configuración", href: "/clubos/dashboard/settings" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-black",
                isActive 
                  ? "bg-primary/10" 
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t">
      <Button
        variant="outline"
        className="w-full justify-start mb-4"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <LogOut className="size-4 mr-2" />
        {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
      </Button>
         <div className="flex items-center gap-3 text-black">
            <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {/* Avatar placeholder */}
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
            </div>
            <div className="text-sm">
                <p className="font-medium">Admin del club</p>
                <p className="text-xs">admin@club.com</p>
            </div>
         </div>
      </div>
    </div>
  )
}

export function MobileSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

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
                        {sidebarItems.map((item) => (
                             <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-black",
                                  pathname === item.href
                                  ? "bg-primary/10"
                                  : "hover:bg-muted"
                                )}
                             >
                                <item.icon className="size-4" />
                                {item.label}
                             </Link>
                        ))}
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
