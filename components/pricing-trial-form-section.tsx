"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DemoRequestSuccessModal } from "@/components/demo-request-success-modal"
import { Loader2 } from "lucide-react"

type DemoRequestApiResponse = {
  ok: boolean
  id?: string
  error?: string
}

export function PricingTrialFormSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  const showErrorToast = (message: string) => {
    setToastError(message)
    window.setTimeout(() => setToastError(null), 4500)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const form = e.currentTarget

    try {
      const formData = new FormData(form)

      const payload = {
        nombre: String(formData.get("nombre") || "").trim(),
        apellido: String(formData.get("apellido") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        telefono: String(formData.get("telefono") || "").trim(),
        rol: String(formData.get("rol") || "").trim(),
        nombreClub: String(formData.get("nombreClub") || "").trim(),
        tipoClub: String(formData.get("tipoClub") || "").trim(),
        tipoCanchas: String(formData.get("tipoCanchas") || "").trim(),
        cantidadCanchas: Number(formData.get("cantidadCanchas") || 0),
        deporte: String(formData.get("deporte") || "").trim(),
        pais: String(formData.get("pais") || "").trim(),
        ciudad: String(formData.get("ciudad") || "").trim(),
        marketingOptIn: formData.get("marketingOptIn") === "on",
      }

      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as DemoRequestApiResponse

      if (!response.ok || !result.ok || !result.id) {
        throw new Error(result.error || "No se pudo enviar el formulario.")
      }

      setIsModalOpen(true)
      form.reset()

      // Optional redirect:
      // window.location.href = `/gracias?id=${result.id}`
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Hubo un error al enviar el formulario."
      setError(message)
      showErrorToast(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-20 md:py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div id="form-prueba" className="max-w-6xl mx-auto rounded-3xl border border-border/40 bg-card p-6 md:p-10 shadow-sm scroll-mt-24">
          <div className="mb-8 text-center">
            <p className="text-primary font-medium text-sm uppercase tracking-widest mb-3">Empezá tu prueba</p>
            <h3 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-3 text-balance">
              Completá el formulario y activamos tu demo
            </h3>
            <p className="text-muted-foreground">
              Te contactamos para configurar Courtly para tu club en minutos.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre*</Label>
                <Input id="firstName" name="nombre" placeholder="Tu nombre" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido*</Label>
                <Input id="lastName" name="apellido" placeholder="Tu apellido" required />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email*</Label>
                <Input id="email" name="email" type="email" placeholder="nombre@club.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono*</Label>
                <Input id="phone" name="telefono" type="tel" placeholder="+54 9 11 0000 0000" required />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="role">Rol*</Label>
                <select
                  id="role"
                  name="rol"
                  required
                  defaultValue=""
                  className="border-input text-foreground data-[placeholder]:text-muted-foreground h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="" disabled>
                    Seleccioná una opción
                  </option>
                  <option value="owner">Dueño/a</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administración</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubName">Nombre del club*</Label>
                <Input id="clubName" name="nombreClub" placeholder="Ej: Club Padel Norte" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubType">Tipo de club*</Label>
                <select
                  id="clubType"
                  name="tipoClub"
                  required
                  defaultValue=""
                  className="border-input text-foreground h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="" disabled>
                    Seleccioná una opción
                  </option>
                  <option value="single">Una sede</option>
                  <option value="multi">Multi-sede</option>
                  <option value="academy">Academia</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="courtType">Tipo de canchas*</Label>
                <select
                  id="courtType"
                  name="tipoCanchas"
                  required
                  defaultValue=""
                  className="border-input text-foreground h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="" disabled>
                    Seleccioná una opción
                  </option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="covered">Techadas</option>
                  <option value="mixed">Mixtas</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="courts">Cantidad de canchas*</Label>
                <Input id="courts" name="cantidadCanchas" type="number" min={1} placeholder="4" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport">Deporte*</Label>
                <Input id="sport" name="deporte" placeholder="Ej: Pádel, Tenis, Fútbol" required />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="country">País*</Label>
                <Input id="country" name="pais" placeholder="Argentina" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad*</Label>
                <Input id="city" name="ciudad" placeholder="Buenos Aires" required />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input type="checkbox" name="marketingOptIn" className="mt-1" />
              Acepto recibir comunicaciones comerciales sobre Courtly.
            </label>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" className="h-11 rounded-xl px-8" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar y activar prueba gratis"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <DemoRequestSuccessModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {toastError && (
        <div className="fixed right-4 bottom-4 z-[60] max-w-sm rounded-lg border border-destructive/20 bg-background px-4 py-3 text-sm text-destructive shadow-lg">
          {toastError}
        </div>
      )}
    </section>
  )
}
