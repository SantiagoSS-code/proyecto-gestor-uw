"use client"

import type React from "react"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthInput } from "@/components/auth/auth-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { Sparkles } from "lucide-react"
import { GoogleAuthProvider, browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { createMinimalPlayerProfile, getPlayerOnboardingStatus } from "@/lib/players"

export function LoginPlayersForm() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/85 border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <Link href="/" className="inline-flex items-center gap-2 justify-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                courtly
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">Cargando…</p>
          </CardContent>
        </Card>
      }
    >
      <LoginPlayersFormInner />
    </Suspense>
  )
}

function LoginPlayersFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = identifier.trim().length > 0 && password.trim().length > 0
  const nextParam = searchParams?.get("next")

  const getSafeNext = (value: string | null) => {
    if (!value) return null
    if (!value.startsWith("/")) return null
    if (value.startsWith("//")) return null
    return value
  }

  const persistNext = (value: string | null) => {
    const safeNext = getSafeNext(value)
    if (typeof window !== "undefined" && safeNext) {
      localStorage.setItem("playerNext", safeNext)
    }
    return safeNext
  }

  const resolveNext = () => {
    const fromQuery = persistNext(nextParam)
    if (fromQuery) return fromQuery
    if (typeof window === "undefined") return null
    return getSafeNext(localStorage.getItem("playerNext"))
  }

  const safeNext = getSafeNext(nextParam)

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setIsSubmitting(true)
    setError(null)

    const email = identifier.trim().toLowerCase()
    if (!email.includes("@")) {
      setError("Usa tu email para iniciar sesión.")
      setIsSubmitting(false)
      return
    }

    try {
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const nextDestination = resolveNext()

      if (typeof window !== "undefined") {
        localStorage.setItem("playerIdentifier", email)
      }

      const status = await getPlayerOnboardingStatus(userCredential.user.uid)
      if (!status.exists) {
        await createMinimalPlayerProfile(userCredential.user.uid, email)
      }

      // If onboarding is done, land on dashboard; otherwise, continue onboarding.
      const goToOnboarding = !status.exists || status.onboardingCompleted === false
      const destination = goToOnboarding
        ? "/players/onboarding/personal-details"
        : nextDestination || "/players/dashboard"

      if (typeof window !== "undefined" && nextDestination && !goToOnboarding) {
        localStorage.removeItem("playerNext")
      }

      router.push(destination)
    } catch (err: any) {
      console.error("[PlayersLogin] email login error", err)
      setError("No pudimos iniciar sesión. Revisa tu email y contraseña.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      await setPersistence(auth, browserLocalPersistence)
      const provider = new GoogleAuthProvider()
      const { user } = await signInWithPopup(auth, provider)
      const email = (user.email || "").toLowerCase().trim()

      if (typeof window !== "undefined") {
        localStorage.setItem("playerSignup", JSON.stringify({ name: user.displayName || "", email }))
        if (email) {
          localStorage.setItem("playerIdentifier", email)
        }
      }

      const status = await getPlayerOnboardingStatus(user.uid)
      if (!status.exists) {
        await createMinimalPlayerProfile(user.uid, email || "")
      }

      const nextDestination = resolveNext()
      // If onboarding is done, land on dashboard; otherwise, continue onboarding.
      const goToOnboarding = !status.exists || status.onboardingCompleted === false
      const destination = goToOnboarding
        ? "/players/onboarding/personal-details"
        : nextDestination || "/players/dashboard"

      if (typeof window !== "undefined" && nextDestination && !goToOnboarding) {
        localStorage.removeItem("playerNext")
      }

      router.push(destination)
    } catch (err) {
      console.error("[PlayersLogin] Google login error", err)
      setError("No pudimos iniciar sesión con Google. Intenta de nuevo.")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md backdrop-blur-sm bg-white/85 border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <Link href="/" className="inline-flex items-center gap-2 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            courtly
          </span>
        </Link>
        <div className="mt-4">
          <CardTitle className="text-2xl font-bold text-gray-900">Inicia sesión para jugar</CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Reservá canchas, encontrá partidos y jugá más.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="h-12 w-full rounded-full border border-gray-200 bg-white text-gray-900 font-semibold shadow-sm hover:border-gray-300"
          >
            {isGoogleLoading ? "Conectando..." : "Continuar con Google"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">o</span>
            </div>
          </div>

        <form onSubmit={handleContinue} className="space-y-5">
            <AuthInput
              id="identifier"
              label="Email"
              placeholder="tu@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <AuthInput
              id="password"
              type="password"
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          <PrimaryButton type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Iniciando..." : "Continuar"}
          </PrimaryButton>

          <p className="text-center text-xs text-gray-500">
            Usamos tu cuenta de Courtly para acceder.
          </p>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Nuevo por aquí?{" "}
          <Link
            href={safeNext ? `/players/signup?next=${encodeURIComponent(safeNext)}` : "/players/signup"}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Crear cuenta
          </Link>
        </div>
        </div>
      </CardContent>
    </Card>
  )
}
