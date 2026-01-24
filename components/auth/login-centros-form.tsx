"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
// import { createClient } from "@/lib/supabase/client"

export function LoginCentrosForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // const handleEmailLogin = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   setError(null)
  //   setIsLoading(true)

  //   try {
  //     const supabase = createClient()
  //     console.log("[v0] Attempting login with email:", email)
  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email,
  //       password,
  //     })

  //     console.log("[v0] Login result:", { data, error })

  //     if (error) {
  //       console.log("[v0] Login error:", error.message, error.status)
  //       if (error.message.includes("Email not confirmed")) {
  //         setError("Por favor verifica tu email antes de iniciar sesión.")
  //       } else if (error.message.includes("Invalid login credentials")) {
  //         setError("Email o contraseña incorrectos. Asegúrate de usar las mismas credenciales con las que te registraste.")
  //       } else {
  //         setError(error.message)
  //       }
  //       return
  //     }

  //     router.push("/dashboard-centros")
  //     router.refresh()
  //   } catch {
  //     setError("Ocurrió un error. Por favor intenta de nuevo.")
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  // const handleGoogleLogin = async () => {
  //   setError(null)
  //   setIsGoogleLoading(true)

  //   try {
  //     const supabase = createClient()
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider: "google",
  //       options: {
  //       redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin}/auth/callback?next=/registro-centros`,
  //     },
  //   })

  //   if (error) {
  //     setError(error.message)
  //   }
  // } catch {
  //   setError("Ocurrió un error con Google. Por favor intenta de nuevo.")
  // } finally {
  //   setIsGoogleLoading(false)
  // }
  // }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-xl">
      <CardHeader className="text-center space-y-4">
        <Link href="/" className="flex items-center justify-center gap-2 mx-auto">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-2xl tracking-tight text-foreground">courtly</span>
        </Link>
        <div>
          <CardTitle className="text-2xl font-bold text-foreground">Bienvenido</CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Inicia sesión en tu cuenta de centro deportivo
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Authentication is currently disabled. Supabase integration will be replaced with Firebase in the future.
          </AlertDescription>
        </Alert>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Authentication features are temporarily unavailable.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
