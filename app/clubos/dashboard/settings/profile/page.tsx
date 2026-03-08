"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useOnboarding } from "@/lib/onboarding"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { updateEmail, updatePassword, updateProfile } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Loader2, ShieldCheck } from "lucide-react"
import { showSavePopupAndRefresh } from "@/lib/save-feedback"

type ProfileForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  newPassword: string
  confirmPassword: string
}

const EMPTY_FORM: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  newPassword: "",
  confirmPassword: "",
}

const splitDisplayName = (displayName?: string | null) => {
  const safe = (displayName || "").trim()
  if (!safe) return { firstName: "", lastName: "" }
  const parts = safe.split(" ").filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { isOnboarding, completeStep } = useOnboarding()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProfileForm>({ ...EMPTY_FORM })
  const [initialSnapshot, setInitialSnapshot] = useState<Omit<ProfileForm, "newPassword" | "confirmPassword">>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const fromAuth = splitDisplayName(user.displayName)
        let nextFirstName = fromAuth.firstName
        let nextLastName = fromAuth.lastName
        let nextEmail = user.email || ""
        let nextPhone = ""

        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data() as any
          nextFirstName = data.firstName || data.first_name || nextFirstName || ""
          nextLastName = data.lastName || data.last_name || nextLastName || ""
          nextEmail = data.email || nextEmail || ""
          nextPhone = data.phone || ""
        }

        const hydrated = {
          firstName: nextFirstName,
          lastName: nextLastName,
          email: nextEmail,
          phone: nextPhone,
        }

        setInitialSnapshot(hydrated)
        setForm({
          ...hydrated,
          newPassword: "",
          confirmPassword: "",
        })
      } catch (error) {
        console.error("Error loading profile:", error)
        setMessage({ type: "error", text: "No se pudo cargar tu perfil. Intenta de nuevo." })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadProfile()
    }
  }, [authLoading, user])

  const hasDataChanges = useMemo(() => {
    return (
      form.firstName.trim() !== initialSnapshot.firstName ||
      form.lastName.trim() !== initialSnapshot.lastName ||
      form.email.trim() !== initialSnapshot.email ||
      form.phone.trim() !== initialSnapshot.phone
    )
  }, [form.firstName, form.lastName, form.email, form.phone, initialSnapshot])

  const hasPasswordChanges = useMemo(() => {
    return form.newPassword.length > 0 || form.confirmPassword.length > 0
  }, [form.newPassword, form.confirmPassword])

  // During onboarding the button is always enabled so the user can advance
  // even if the pre-loaded data hasn't changed
  const canSave = isOnboarding || hasDataChanges || hasPasswordChanges

  const profileChecklist = useMemo(
    () => [
      { id: "firstName", label: "Nombre", done: form.firstName.trim().length >= 2 },
      { id: "lastName", label: "Apellido", done: form.lastName.trim().length >= 2 },
      { id: "email", label: "Email válido", done: form.email.trim().length > 3 && form.email.includes("@") },
      { id: "phone", label: "Teléfono", done: form.phone.trim().length >= 8 },
    ],
    [form.firstName, form.lastName, form.email, form.phone]
  )

  const profileReady = useMemo(() => profileChecklist.every((item) => item.done), [profileChecklist])

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validate = (): string | null => {
    const email = form.email.trim()

    if (!email) return "El email es obligatorio."
    if (!email.includes("@")) return "Ingresa un email válido."

    if (form.newPassword || form.confirmPassword) {
      if (form.newPassword.length < 6) {
        return "La contraseña debe tener al menos 6 caracteres."
      }
      if (form.newPassword !== form.confirmPassword) {
        return "La confirmación de contraseña no coincide."
      }
    }

    return null
  }

  const handleSave = async () => {
    if (!user) return

    const validationError = validate()
    if (validationError) {
      setMessage({ type: "error", text: validationError })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const currentUser = auth.currentUser
      const nextEmail = form.email.trim()
      const nextDisplayName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()

      if (currentUser) {
        if (nextEmail && nextEmail !== currentUser.email) {
          await updateEmail(currentUser, nextEmail)
        }

        if (nextDisplayName !== (currentUser.displayName || "")) {
          await updateProfile(currentUser, { displayName: nextDisplayName || null })
        }

        if (form.newPassword) {
          await updatePassword(currentUser, form.newPassword)
        }
      }

      const nextProfile = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: nextEmail,
        phone: form.phone.trim(),
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          ...nextProfile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      setInitialSnapshot(nextProfile)
      setForm((prev) => ({
        ...prev,
        ...nextProfile,
        newPassword: "",
        confirmPassword: "",
      }))

      if (isOnboarding) {
        const nextHref = await completeStep("profile")
        if (nextHref) {
          router.push(nextHref)
          return
        }
      }

      showSavePopupAndRefresh("Cambios guardados correctamente.")
      return
    } catch (error: any) {
      console.error("Error updating profile:", error)

      if (error?.code === "auth/requires-recent-login") {
        showSavePopupAndRefresh("Para cambiar email o contraseña, volvé a iniciar sesión y reintentá. La página se va a recargar.", "error")
        return
      } else if (error?.code === "auth/email-already-in-use") {
        showSavePopupAndRefresh("Ese email ya está en uso por otra cuenta. La página se va a recargar.", "error")
        return
      } else {
        showSavePopupAndRefresh("No se pudieron guardar los cambios. La página se va a recargar.", "error")
        return
      }
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-slate-500">Cargando tu cuenta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi cuenta</h1>
        <p className="text-slate-500 mt-2">Tu información personal y seguridad de acceso.</p>
      </div>

      {isOnboarding && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex gap-3 text-sm text-blue-800">
          <span className="text-lg leading-none">👋</span>
          <p>
            <strong>Primero lo primero:</strong> completá tu nombre y teléfono para que tu equipo y nuestro soporte puedan identificarte. Después te vamos a llevar paso a paso a configurar tu centro.
          </p>
        </div>
      )}

      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
              <CardDescription>Estos datos pertenecen al usuario que inició sesión y pueden editarse en cualquier momento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="Ingresa tu nombre"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Ingresa tu apellido"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="nombre@dominio.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Ej: +54 9 11 1234 5678"
                  className="h-11"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Seguridad</p>
                    <p className="text-xs text-slate-500">Si quieres cambiar la contraseña, complétala abajo.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={form.newPassword}
                      onChange={(e) => handleChange("newPassword", e.target.value)}
                      placeholder="Nueva contraseña"
                      className="h-11 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      placeholder="Repite la contraseña"
                      className="h-11 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !canSave} className="h-11 px-6">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {!profileReady ? (
          <div className="xl:sticky xl:top-6">
            <Card className="shadow-sm border border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-slate-900">Checklist</CardTitle>
                    <CardDescription>Onboarding de Mi cuenta.</CardDescription>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap bg-amber-100 text-amber-700">
                    Faltan datos
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {profileChecklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${item.done ? "text-green-600" : "text-slate-300"}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
