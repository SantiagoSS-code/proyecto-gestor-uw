"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface PlayerOnboardingLocal {
  ageRange?: string
  gender?: string
  sports?: string[]
  level?: string
}

const defaultNotifications = [
  { id: "1", title: "Tu reserva está confirmada", time: "Hace 2h" },
  { id: "2", title: "Nuevo partido cercano disponible", time: "Ayer" },
  { id: "3", title: "Actualiza tu perfil para mejores matches", time: "Hace 3 días" },
]

export default function PlayerDashboardPage() {
  const { user } = useAuth()
  const [localProfile, setLocalProfile] = useState<PlayerOnboardingLocal>({})
  const [hasUpcoming] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("playerOnboarding")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PlayerOnboardingLocal
      setLocalProfile(parsed || {})
    } catch {
      setLocalProfile({})
    }
  }, [])

  const firstName = useMemo(() => {
    const fallback = user?.email?.split("@")[0] || "Jugador"
    const name = user?.displayName || fallback
    return name.split(" ")[0]
  }, [user])

  const chips = useMemo(() => {
    const items: string[] = []
    if (localProfile.sports?.length) {
      items.push(localProfile.sports.join(" · "))
    }
    if (localProfile.level) items.push(localProfile.level)
    if (localProfile.ageRange) items.push(localProfile.ageRange)
    return items
  }, [localProfile])

  const stats = [
    { label: "Partidos jugados", value: "12" },
    { label: "Reservas este mes", value: "4" },
    { label: "Club favorito", value: "Padel Hub" },
    { label: "Deporte más jugado", value: localProfile.sports?.[0] || "Padel" },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2 text-black" aria-label="Ir a la landing">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl tracking-tight">courtly</span>
          </Link>
        </div>
        {/* Header card */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-black">Hola,</p>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{firstName}</h1>
              <p className="mt-1 text-black">Listo para jugar?</p>
              {chips.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-black"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-black">
                  Completa tu perfil para recibir recomendaciones personalizadas.
                </p>
              )}
            </div>
            <Button asChild className="rounded-full">
              <Link href="/players/profile">Editar perfil</Link>
            </Button>
          </div>
        </section>

        {/* Primary actions */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Reservar cancha", href: "/clubs" },
            { title: "Encontrar partido", href: "/players" },
            { title: "Mis reservas", href: "/players" },
          ].map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
            >
              <p className="text-sm text-black">Acción rápida</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{action.title}</h3>
              <p className="mt-1 text-sm text-black">Empezar ahora</p>
            </Link>
          ))}
        </section>

        {/* Upcoming booking */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Próxima reserva</h2>
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/clubs">Reservar</Link>
            </Button>
          </div>

          {hasUpcoming ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-black">Dom 4 Feb · 19:00</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Club Alto Padel</h3>
              <p className="text-sm text-black">Padel · Cancha 2</p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-sm text-black">Aún no tienes reservas próximas.</p>
              <Button asChild className="mt-4 rounded-full">
                <Link href="/clubs">Reservar ahora</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Tus stats</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-black">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Notificaciones</h2>
            <Link href="/players" className="text-sm font-medium text-black">
              Ver todo
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {defaultNotifications.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-sm text-slate-700">{note.title}</p>
                <span className="text-xs text-black">{note.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
