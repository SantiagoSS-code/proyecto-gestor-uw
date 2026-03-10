"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { auth } from "@/lib/firebaseClient"
import { signInWithEmailAndPassword } from "firebase/auth"

export function LoginCentrosForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      console.log("[Firebase] Attempting login with email:", email)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("[Firebase] Login successful:", userCredential.user.uid)

      const idToken = await userCredential.user.getIdToken()
      console.log("[Login] Got ID token, sending to session endpoint")
      
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      })

      console.log("[Login] Session response status:", sessionRes.status)
      const sessionData = await sessionRes.json().catch(() => null)
      console.log("[Login] Session response:", sessionData)

      if (!sessionRes.ok) {
        const errorMsg = sessionData?.error || "Failed to create session"
        throw new Error(errorMsg)
      }

      console.log("[Login] Session created successfully")
      console.log("[Login] Session response data:", sessionData)
      
      // Esperar un poco para asegurar que la cookie se ha establecido
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log("[Login] Redirecting to dashboard")
      router.push("/clubos/dashboard")
      
      // Refresca la página para asegurar que el middleware se ejecute
      await new Promise(resolve => setTimeout(resolve, 300))
      router.refresh()
    } catch (error: any) {
      console.log("[Firebase] Login error:", error.message, error.code)
      if (error.code === "auth/user-not-found") {
        setError("No se encontró una cuenta con este email. Verifica que estés registrado.")
      } else if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta. Inténtalo de nuevo.")
      } else if (error.code === "auth/invalid-email") {
        setError("Email inválido.")
      } else if (error.code === "auth/user-disabled") {
        setError("Esta cuenta ha sido deshabilitada.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Inténtalo más tarde.")
      } else {
        setError(error.message || "Ocurrió un error al iniciar sesión. Por favor intenta de nuevo.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-xl">
      <CardHeader className="text-center space-y-4">
        <Link href="/" className="flex items-center justify-center mx-auto">
          <VoydLogo className="h-10" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/pricing#form-prueba" className="text-primary hover:underline font-medium">
              Registra tu Club
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium">
              ¿Has olvidado tu contraseña?
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
