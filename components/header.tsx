"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, X, Sparkles, User, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const playerLoginHref = useMemo(() => {
    const query = searchParams?.toString()
    const current = query ? `${pathname}?${query}` : pathname
    return `/players/login?next=${encodeURIComponent(current)}`
  }, [pathname, searchParams])

  const handleSignOut = async () => {
    await signOut(auth)
    router.push("/")
  }

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
            <Link href="/clubs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clubs
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs text-black font-semibold bg-white border border-gray-200">
                        {getInitials(user.displayName || user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.displayName && (
                        <p className="font-semibold text-black tracking-tight">{user.displayName}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-black font-medium">
                        {user.displayName || user.email?.split('@')[0] || 'User'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/players/dashboard" className="cursor-pointer text-black">
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-black">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href={playerLoginHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Login Jugadores
                </Link>
                <Link href="/auth/login">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5">
                    Login Centros
                  </Button>
                </Link>
              </>
            )}
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
              <Link href="/clubs" className="text-sm text-foreground hover:text-primary py-2">
                Clubs
              </Link>
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-3 border-b border-border">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm text-black font-semibold bg-white border border-gray-200">
                        {getInitials(user.displayName || user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      {user.displayName && (
                        <p className="font-semibold text-black tracking-tight">{user.displayName}</p>
                      )}
                      <p className="text-sm text-black font-medium">{user.displayName || user.email?.split('@')[0] || 'User'}</p>
                    </div>
                  </div>
                  <Link href="/players/dashboard" className="flex items-center gap-2 text-black hover:text-blue-600 py-2">
                    <User className="w-4 h-4" />
                    Mi perfil
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="justify-start text-black hover:text-blue-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href={playerLoginHref} className="text-sm text-foreground hover:text-primary py-2">
                    Login Jugadores
                  </Link>
                  <Link href="/auth/login">
                    <Button className="bg-primary text-primary-foreground w-full rounded-full">Login Centros</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
