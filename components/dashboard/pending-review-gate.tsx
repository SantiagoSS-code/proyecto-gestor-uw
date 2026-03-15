"use client"

import React, { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { db } from "@/lib/firebaseClient"
import { auth } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"

type Status = "loading" | "pending" | "approved" | "none"

/**
 * Wraps the entire dashboard layout.
 * - If the center's reviewStatus === "pending" and published !== true → shows a
 *   full-screen waiting room (no sidebar, no nav).
 * - Listens in real-time: as soon as the backoffice flips published → true, the
 *   approved screen appears automatically (one-time, then user goes to login).
 * - Once published=true and user logs in fresh → renders children normally.
 */
export function PendingReviewGate({ children }: { children: React.ReactNode }) {
  const { user, centerId, loading: authLoading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [adminEmail, setAdminEmail] = useState("")
  // Show the one-time approval screen only when status transitions pending→approved
  const [showApprovedScreen, setShowApprovedScreen] = useState(false)
  const prevStatus = React.useRef<Status>("loading")

  useEffect(() => {
    // Show the one-time approval screen only when transitioning from pending → approved
    if (prevStatus.current === "pending" && status === "approved") {
      setShowApprovedScreen(true)
    }
    prevStatus.current = status
  }, [status])

  useEffect(() => {
    if (authLoading || !user) return

    const resolvedId = centerId || user.uid

    // Try centers first, fall back to padel_centers
    const centersRef = doc(db, FIRESTORE_COLLECTIONS.centers, resolvedId)
    const legacyRef = doc(db, FIRESTORE_COLLECTIONS.legacyCenters, resolvedId)

    let unsubLegacy: (() => void) | null = null

    const unsubCenters = onSnapshot(centersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any
        unsubLegacy?.()   // stop listening to legacy once we have the real doc
        if (data.published === true) {
          setStatus("approved")
        } else if (data.reviewStatus === "pending") {
          setStatus("pending")
        } else {
          setStatus("none")
        }
        setAdminEmail(data.email || "")
      } else {
        // centers doc doesn't exist — try legacy
        unsubLegacy = onSnapshot(legacyRef, (legacySnap) => {
          if (legacySnap.exists()) {
            const data = legacySnap.data() as any
            if (data.published === true) {
              setStatus("approved")
            } else if (data.reviewStatus === "pending") {
              setStatus("pending")
            } else {
              setStatus("none")
            }
            setAdminEmail(data.email || "")
          } else {
            setStatus("none")
          }
        })
      }
    })

    return () => {
      unsubCenters()
      unsubLegacy?.()
    }
  }, [user, centerId, authLoading])

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // ── Pending: full-screen waiting room ──────────────────────────────────────
  if (status === "pending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        {/* Logo */}
        <div className="mb-10 text-slate-400 text-xs font-semibold tracking-widest uppercase">
          Courtly · ClubOS
        </div>

        {/* Icon */}
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-100 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-amber-200/70" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg">
            <Clock className="h-7 w-7" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">¡Solicitud enviada para revisión!</h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Estamos revisando los datos de tu centro. Te vamos a avisar por mail cuando
            esté aprobado y listo para recibir reservas.
          </p>

          <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Mail className="w-4 h-4 shrink-0" />
            <span>
              Recibirás un email de confirmación en{" "}
              <strong>{adminEmail || "tu correo registrado"}</strong>
            </span>
          </div>

          <p className="text-slate-400 text-sm pt-2">
            Esta pantalla se actualizará automáticamente cuando tu centro sea habilitado.
          </p>
        </div>

        {/* Logout */}
        <button
          className="mt-12 text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          onClick={() => router.push("/clubos/login")}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  // ── Approved: full-screen success (shown only on pending→approved transition) ──
  if (showApprovedScreen) {
    const handleGoToLogin = async () => {
      try { await signOut(auth) } catch {}
      router.push("/clubos/login")
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="mb-10 text-slate-400 text-xs font-semibold tracking-widest uppercase">
          Courtly · ClubOS
        </div>

        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-green-100 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-green-200/70" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg">
            <CheckCircle className="h-7 w-7" />
          </div>
        </div>

        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">¡Tu centro está publicado! 🎉</h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Los jugadores ya pueden encontrarte y generar reservas directamente desde la plataforma.
          </p>
          <Button
            onClick={handleGoToLogin}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Iniciar sesión en la plataforma
          </Button>
        </div>
      </div>
    )
  }

  // ── Normal: render dashboard ───────────────────────────────────────────────
  return <>{children}</>
}
