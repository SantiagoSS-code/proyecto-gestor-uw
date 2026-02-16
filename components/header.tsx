"use client"

<<<<<<< Updated upstream
import { useState, useEffect } from "react"
=======
import { Suspense, useMemo, useState } from "react"
>>>>>>> Stashed changes
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, X, Sparkles, User, LogOut, LayoutDashboard } from "lucide-react"
// import { createClient } from "@/lib/supabase/client"
// import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserProfile {
  type: "center" | "player" | null
  name: string
  email: string
  dashboardUrl: string
}

export function Header() {
  return (
    <Suspense
      fallback={
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-xl tracking-tight text-foreground">courtly</span>
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link href="/clubs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Clubs
                </Link>
              </div>
            </div>
          </div>
        </header>
      }
    >
      <HeaderInner />
    </Suspense>
  )
}

function HeaderInner() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // const [user, setUser] = useState<SupabaseUser | null>(null)
  // const [profile, setProfile] = useState<UserProfile | null>(null)
  // const [loading, setLoading] = useState(true)
  const router = useRouter()
  // const supabase = createClient()

  // useEffect(() => {
  //   // Get initial session
  //   const getSession = async () => {
  //     const { data: { session } } = await supabase.auth.getSession()
  //     setUser(session?.user ?? null)
  //     if (session?.user) {
  //       await loadUserProfile(session.user.id)
  //     }
  //     setLoading(false)
  //   }

  //   getSession()

  //   // Listen for auth changes
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  //     setUser(session?.user ?? null)
  //     if (session?.user) {
  //       await loadUserProfile(session.user.id)
  //     } else {
  //       setProfile(null)
  //     }
  //   })

  //   return () => {
  //     subscription.unsubscribe()
  //   }
  // }, [])

  // const loadUserProfile = async (userId: string) => {
  //   // First check if user is a center admin
  //   const { data: centerAdmin } = await supabase
  //     .from("center_admins")
  //     .select("first_name, last_name, email")
  //     .eq("user_id", userId)
  //     .single()

  //   if (centerAdmin) {
  //     setProfile({
  //       type: "center",
  //       name: `${centerAdmin.first_name} ${centerAdmin.last_name}`,
  //       email: centerAdmin.email,
  //       dashboardUrl: "/dashboard-centros",
  //     })
  //     return
  //   }

  //   // TODO: Check if user is a player when player auth is implemented
  //   // For now, if no center_admin found, show basic user info
  //   const { data: { user } } = await supabase.auth.getUser()
  //   if (user) {
  //     setProfile({
  //       type: "player",
  //       name: user.email?.split("@")[0] || "Usuario",
  //       email: user.email || "",
  //       dashboardUrl: "/", // TODO: Change to player dashboard when implemented
  //     })
  //   }
  // }

  // const handleSignOut = async () => {
  //   await supabase.auth.signOut()
  //   setUser(null)
  //   setProfile(null)
  //   router.push("/")
  //   router.refresh()
  // }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-foreground">courtly</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Supabase disabled - TODO: Implement Firebase auth */}
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login Jugadores
            </Link>
            <Link href="/login-centros">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5">
                Login Centros
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50">
          <div className="container mx-auto px-4 py-6">
            <nav className="flex flex-col gap-3">
              {/* Supabase disabled - TODO: Implement Firebase auth */}
              <Link href="#" className="text-sm text-foreground hover:text-primary py-2">
                Login Jugadores
              </Link>
              <Link href="/login-centros">
                <Button className="bg-primary text-primary-foreground w-full rounded-full">Login Centros</Button>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
