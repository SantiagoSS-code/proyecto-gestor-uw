"use client"

import { useRouter } from "next/navigation"
import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Phone,
  Building2,
  MapPin,
  Clock,
  Upload,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0")
  return `${hour}:00`
})

const PROVINCIAS = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
]

interface AdminFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

interface CenterFormData {
  name: string
  street: string
  streetNumber: string
  province: string
  city: string
  postalCode: string
  phone: string
  email: string
  hours: Record<string, { open: string; close: string; closed: boolean }>
  image: File | null
}

type Step = "admin" | "verify-email" | "verify-phone" | "center"

interface RegistroCentrosFormProps {
  initialGoogleEmail?: string | null
  initialGoogleName?: string | null
}

export function RegistroCentrosForm({ initialGoogleEmail, initialGoogleName }: RegistroCentrosFormProps = {}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("admin")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [emailCode, setEmailCode] = useState("")
  const [phoneCode, setPhoneCode] = useState("")
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [googleUserData, setGoogleUserData] = useState<{ email: string; name: string } | null>(null)
  const [generatedEmailCode, setGeneratedEmailCode] = useState<string>("")
  const [generatedPhoneCode, setGeneratedPhoneCode] = useState<string>("")

  const [adminData, setAdminData] = useState<AdminFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  const [centerData, setCenterData] = useState<CenterFormData>({
    name: "",
    street: "",
    streetNumber: "",
    province: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    hours: DAYS_OF_WEEK.reduce(
      (acc, day) => ({
        ...acc,
        [day.key]: { open: "08:00", close: "22:00", closed: false },
      }),
      {},
    ),
    image: null,
  })

  // Check if user came from Google OAuth
  useEffect(() => {
    const checkGoogleUser = async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && user.app_metadata?.provider === "google") {
        setIsGoogleUser(true)
        setEmailVerified(true)
        setGoogleUserData({
          email: user.email || "",
          name: user.user_metadata?.full_name || "",
        })

        const nameParts = (user.user_metadata?.full_name || "").split(" ")
        setAdminData((prev) => ({
          ...prev,
          email: user.email || "",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
        }))
      }
    }

    checkGoogleUser()
  }, [])

  const handleGoogleSignup = async () => {
    setError(null)
    setIsGoogleLoading(true)

    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin}/auth/callback?next=/registro-centros`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch {
      setError("Ocurrió un error con Google. Por favor intenta de nuevo.")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const validateAdminStep = (): boolean => {
    const errors: string[] = []

    if (!adminData.firstName.trim()) errors.push("El nombre es obligatorio")
    if (!adminData.lastName.trim()) errors.push("El apellido es obligatorio")
    if (!adminData.email.trim()) errors.push("El email es obligatorio")
    if (!adminData.phone.trim()) errors.push("El teléfono es obligatorio")

    if (!isGoogleUser) {
      if (!adminData.password) errors.push("La contraseña es obligatoria")
      if (adminData.password.length < 6) errors.push("La contraseña debe tener al menos 6 caracteres")
      if (adminData.password !== adminData.confirmPassword) errors.push("Las contraseñas no coinciden")
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (adminData.email && !emailRegex.test(adminData.email)) {
      errors.push("El formato del email no es válido")
    }

    const phoneRegex = /^[0-9+\-\s()]{8,}$/
    if (adminData.phone && !phoneRegex.test(adminData.phone)) {
      errors.push("El formato del teléfono no es válido")
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const validateCenterStep = (): boolean => {
    const errors: string[] = []

    if (!centerData.name.trim()) errors.push("El nombre del centro es obligatorio")
    if (!centerData.street.trim()) errors.push("La calle es obligatoria")
    if (!centerData.streetNumber.trim()) errors.push("El número es obligatorio")
    if (!centerData.province) errors.push("La provincia es obligatoria")
    if (!centerData.city.trim()) errors.push("La localidad es obligatoria")
    if (!centerData.postalCode.trim()) errors.push("El código postal es obligatorio")
    if (!centerData.phone.trim()) errors.push("El teléfono del centro es obligatorio")
    if (!centerData.email.trim()) errors.push("El email del centro es obligatorio")
    if (!centerData.image) errors.push("La imagen del centro es obligatoria")

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (centerData.email && !emailRegex.test(centerData.email)) {
      errors.push("El formato del email del centro no es válido")
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSendEmailCode = async () => {
    if (!validateAdminStep()) return

    setIsLoading(true)
    setError(null)

    try {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedEmailCode(code)

      // Send the code via our API route
      const response = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminData.email,
          code: code,
          name: adminData.firstName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Error al enviar el código de verificación")
        return
      }

      setCodeSent(true)
      setStep("verify-email")
    } catch {
      setError("Ocurrió un error. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyEmail = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (emailCode === generatedEmailCode) {
        setEmailVerified(true)
        setStep("verify-phone")
      } else {
        setError("Código inválido. Por favor verifica e intenta de nuevo.")
      }
    } catch {
      setError("Ocurrió un error. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedEmailCode(code)

      const response = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminData.email,
          code: code,
          name: adminData.firstName,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || "Error al reenviar el código")
        return
      }

      alert("Nuevo código enviado a tu email")
    } catch {
      setError("Ocurrió un error reenviando el código.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendPhoneCode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Generate a 6-digit code for phone
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedPhoneCode(code)

      // In production, this would send an SMS via Twilio
      // For now, we'll show the code in an alert for testing
      setPhoneCodeSent(true)

      // Demo: show code (in production, send via SMS)
      alert(`Demo: Tu código de verificación es ${code}`)
    } catch {
      setError("Ocurrió un error enviando el código. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyPhone = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (phoneCode === generatedPhoneCode) {
        setPhoneVerified(true)
        setStep("center")
      } else {
        setError("Código inválido. Por favor verifica e intenta de nuevo.")
      }
    } catch {
      setError("Ocurrió un error. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCenterData({ ...centerData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleHoursChange = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setCenterData({
      ...centerData,
      hours: {
        ...centerData.hours,
        [day]: {
          ...centerData.hours[day],
          [field]: value,
        },
      },
    })
  }

  const handleSubmitCenter = async () => {
    if (!validateCenterStep()) return

    setIsLoading(true)
    setError("")

    try {
      const supabase = createBrowserClient()

      // For Google users, we still use the existing flow since they have an active session
      if (isGoogleUser) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("No se pudo obtener el usuario de Google. Por favor intenta de nuevo.")
          return
        }

        // Upload image first
        let imageUrl = null
        if (centerData.image) {
          const fileExt = centerData.image.name.split(".").pop()
          const fileName = `${user.id}-${Date.now()}.${fileExt}`

          const { error: uploadError } = await supabase.storage.from("center-images").upload(fileName, centerData.image)

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("center-images").getPublicUrl(fileName)
            imageUrl = publicUrl
          }
        }

        // Use server API for Google users too
        const response = await fetch("/api/registro-centro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isGoogleUser: true,
            userId: user.id,
            adminData: {
              firstName: adminData.firstName,
              lastName: adminData.lastName,
              email: adminData.email,
              phone: adminData.phone,
            },
            centerData: {
              name: centerData.name,
              street: centerData.street,
              number: centerData.streetNumber,
              province: centerData.province,
              city: centerData.city,
              postalCode: centerData.postalCode,
              phone: centerData.phone,
              email: centerData.email,
            },
            centerHours: DAYS_OF_WEEK.map((day) => ({
              day: day.key,
              isOpen: !centerData.hours[day.key].closed,
              openTime: centerData.hours[day.key].open,
              closeTime: centerData.hours[day.key].close,
            })),
            centerImageUrl: imageUrl,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || "Error al crear el centro")
          return
        }

        router.push("/dashboard-centros")
        return
      }

      // For email/password users, call API route to create user and insert data
      // Upload image first using anon client (storage should be public for uploads)
      let imageUrl = null
      if (centerData.image) {
        const fileExt = centerData.image.name.split(".").pop()
        const fileName = `temp-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("center-images").upload(fileName, centerData.image)

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("center-images").getPublicUrl(fileName)
          imageUrl = publicUrl
        }
      }

      // Call server API to create user and insert all data
      const response = await fetch("/api/registro-centro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password,
          adminData: {
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            email: adminData.email,
            phone: adminData.phone,
          },
          centerData: {
            name: centerData.name,
            street: centerData.street,
            number: centerData.streetNumber,
            province: centerData.province,
            city: centerData.city,
            postalCode: centerData.postalCode,
            phone: centerData.phone,
            email: centerData.email,
          },
          centerHours: DAYS_OF_WEEK.map((day) => ({
            day: day.key,
            isOpen: !centerData.hours[day.key].closed,
            openTime: centerData.hours[day.key].open,
            closeTime: centerData.hours[day.key].close,
          })),
          centerImageUrl: imageUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Error al crear la cuenta")
        return
      }

      // Sign in the user after successful registration
      console.log("[v0] Attempting sign in with email:", adminData.email)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: adminData.email,
        password: adminData.password,
      })

      console.log("[v0] Sign in result:", { signInData, signInError })

      if (signInError) {
        console.log("[v0] Sign in error after registration:", signInError.message)
        // User was created but couldn't sign in - show error and redirect to login
        setError(`Cuenta creada pero no se pudo iniciar sesión automáticamente: ${signInError.message}. Por favor inicia sesión manualmente.`)
        setTimeout(() => {
          router.push("/login-centros?registered=true")
        }, 3000)
        return
      }

      // Success! Redirect to dashboard
      router.push("/dashboard-centros")
    } catch (err) {
      console.log("[v0] Unexpected error:", err)
      setError("Ocurrió un error inesperado. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const renderAdminStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre *</Label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                placeholder="Juan"
                className="pl-10"
                value={adminData.firstName}
                onChange={(e) => setAdminData({ ...adminData, firstName: e.target.value })}
                disabled={isGoogleUser && !!googleUserData?.name}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido *</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Pérez"
              value={adminData.lastName}
              onChange={(e) => setAdminData({ ...adminData, lastName: e.target.value })}
              disabled={isGoogleUser && !!googleUserData?.name}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              className="pl-10"
              value={adminData.email}
              onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
              disabled={isGoogleUser}
            />
          </div>
          {isGoogleUser && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Email verificado con Google
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+54 11 1234-5678"
              className="pl-10"
              value={adminData.phone}
              onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
            />
          </div>
        </div>

        {!isGoogleUser && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={adminData.confirmPassword}
                  onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={isGoogleUser ? () => setStep("verify-phone") : handleSendEmailCode}
        className="w-full bg-primary"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isGoogleUser ? "Continuando..." : "Enviando código..."}
          </>
        ) : (
          <>
            {isGoogleUser ? "Continuar" : "Enviar código de verificación"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {!isGoogleUser && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O continuar con</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Google
          </Button>
        </>
      )}
    </div>
  )

  const renderVerifyEmailStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold">Verifica tu email</h3>
        <p className="text-sm text-muted-foreground">
          Hemos enviado un código de 6 dígitos a <strong>{adminData.email}</strong>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailCode">Código de verificación</Label>
        <Input
          id="emailCode"
          type="text"
          placeholder="123456"
          className="text-center text-2xl tracking-widest"
          maxLength={6}
          value={emailCode}
          onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleVerifyEmail}
          className="w-full bg-primary"
          disabled={isLoading || emailCode.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              Verificar código
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <Button variant="ghost" className="w-full" onClick={handleResendCode} disabled={isLoading}>
          Reenviar código
        </Button>

        <Button variant="ghost" className="w-full" onClick={() => setStep("admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>
  )

  const renderVerifyPhoneStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold">Verifica tu teléfono</h3>
        <p className="text-sm text-muted-foreground">
          Te enviaremos un código de verificación a <strong>{adminData.phone}</strong>
        </p>
      </div>

      {!phoneCodeSent ? (
        <Button onClick={handleSendPhoneCode} className="w-full bg-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar código SMS"
          )}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="phoneCode">Código de verificación</Label>
            <Input
              id="phoneCode"
              type="text"
              placeholder="123456"
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <Button
            onClick={handleVerifyPhone}
            className="w-full bg-primary"
            disabled={isLoading || phoneCode.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Verificar código
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button variant="ghost" className="w-full" onClick={() => setStep(isGoogleUser ? "admin" : "verify-email")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>
  )

  const renderCenterStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
        <CheckCircle2 className="h-4 w-4" />
        Email y teléfono verificados correctamente
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="centerName">Nombre del Centro *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="centerName"
              type="text"
              placeholder="Club Deportivo Central"
              className="pl-10"
              value={centerData.name}
              onChange={(e) => setCenterData({ ...centerData, name: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="street">Calle *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="street"
                type="text"
                placeholder="Av. Libertador"
                className="pl-10"
                value={centerData.street}
                onChange={(e) => setCenterData({ ...centerData, street: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="streetNumber">Número *</Label>
            <Input
              id="streetNumber"
              type="text"
              placeholder="1234"
              value={centerData.streetNumber}
              onChange={(e) => setCenterData({ ...centerData, streetNumber: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="province">Provincia *</Label>
            <Select
              value={centerData.province}
              onValueChange={(value) => setCenterData({ ...centerData, province: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCIAS.map((prov) => (
                  <SelectItem key={prov} value={prov}>
                    {prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Localidad *</Label>
            <Input
              id="city"
              type="text"
              placeholder="Buenos Aires"
              value={centerData.city}
              onChange={(e) => setCenterData({ ...centerData, city: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Código Postal *</Label>
          <Input
            id="postalCode"
            type="text"
            placeholder="C1425"
            value={centerData.postalCode}
            onChange={(e) => setCenterData({ ...centerData, postalCode: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="centerPhone">Teléfono del Centro *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="centerPhone"
                type="tel"
                placeholder="+54 11 1234-5678"
                className="pl-10"
                value={centerData.phone}
                onChange={(e) => setCenterData({ ...centerData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="centerEmail">Email del Centro *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="centerEmail"
                type="email"
                placeholder="contacto@centro.com"
                className="pl-10"
                value={centerData.email}
                onChange={(e) => setCenterData({ ...centerData, email: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horarios de Apertura *
          </Label>
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.key} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium">{day.label}</div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={centerData.hours[day.key].closed}
                    onChange={(e) => handleHoursChange(day.key, "closed", e.target.checked)}
                    className="rounded"
                  />
                  Cerrado
                </label>
                {!centerData.hours[day.key].closed && (
                  <>
                    <Select
                      value={centerData.hours[day.key].open}
                      onValueChange={(value) => handleHoursChange(day.key, "open", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">a</span>
                    <Select
                      value={centerData.hours[day.key].close}
                      onValueChange={(value) => handleHoursChange(day.key, "close", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Imagen del Centro *</Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          >
            {imagePreview ? (
              <div className="space-y-2">
                <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                <p className="text-sm text-muted-foreground">Click para cambiar imagen</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click para subir imagen</p>
                <p className="text-xs text-muted-foreground">PNG, JPG hasta 5MB</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button onClick={handleSubmitCenter} className="w-full bg-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando centro...
            </>
          ) : (
            <>
              Completar Registro
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <Button variant="ghost" className="w-full" onClick={() => setStep("verify-phone")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Registro de Centro</CardTitle>
        <CardDescription>
          {step === "admin" && "Paso 1: Datos del administrador"}
          {step === "verify-email" && "Verificación de email"}
          {step === "verify-phone" && "Verificación de teléfono"}
          {step === "center" && "Paso 2: Datos del centro"}
        </CardDescription>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 pt-4">
          <div
            className={`h-2 w-16 rounded-full ${step === "admin" || step === "verify-email" || step === "verify-phone" || step === "center" ? "bg-primary" : "bg-muted"}`}
          />
          <div className={`h-2 w-16 rounded-full ${step === "center" ? "bg-primary" : "bg-muted"}`} />
        </div>
      </CardHeader>
      <CardContent>
        {step === "admin" && renderAdminStep()}
        {step === "verify-email" && renderVerifyEmailStep()}
        {step === "verify-phone" && renderVerifyPhoneStep()}
        {step === "center" && renderCenterStep()}

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login-centros" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
