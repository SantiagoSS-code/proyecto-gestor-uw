"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { Eye, EyeOff } from "lucide-react"

type InvitePayload = {
  centerId: string | null
  centerName: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  expiresAt: string | null
}

export default function ClubOSRegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams])

  const [loadingInvite, setLoadingInvite] = useState(true)
  const [invite, setInvite] = useState<InvitePayload | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError("Link inválido: falta token.")
        setLoadingInvite(false)
        return
      }

      try {
        setLoadingInvite(true)
        setError("")
        const res = await fetch(`/api/clubos/register?token=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(String(data?.error || "No se pudo validar el link"))
          setInvite(null)
          return
        }

        setInvite(data.invite)
        setEmail(String(data?.invite?.email || ""))
      } catch {
        setError("No se pudo validar el link")
      } finally {
        setLoadingInvite(false)
      }
    }
    run()
  }, [token])

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Completá email y contraseña")
      return
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const res = await fetch("/api/clubos/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(String(data?.error || "No se pudo completar el registro"))
        return
      }

      setSuccess(String(data?.message || "Registro completado."))
      setPassword("")
      const nextCenterId = String(data?.centerId || invite?.centerId || "")
      router.push(`/clubos/register/plan?centerId=${encodeURIComponent(nextCenterId)}&email=${encodeURIComponent(email)}`)
    } catch {
      setError("No se pudo completar el registro")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-slate-200 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <VoydLogo className="h-10" />
          </div>
          <CardTitle>Creá tu cuenta</CardTitle>
          <CardDescription>
            Completá tus datos para acceder a ClubOS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingInvite ? (
            <p className="text-sm text-slate-500">Validando link…</p>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertDescription>
                {success}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="reg-email">Email del administrador</Label>
            <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!success || !invite} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-password">Contraseña</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!success || !invite}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving || !!success || !invite}>
            {saving ? "Registrando..." : "Registrar"}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
