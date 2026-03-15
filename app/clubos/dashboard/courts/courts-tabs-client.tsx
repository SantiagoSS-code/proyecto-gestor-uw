"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import { CourtsLayout } from "@/components/dashboard/courts-layout"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CourtsTab } from "@/components/dashboard/center/courts-tab"
import ScheduleTab from "@/components/dashboard/center/schedule-tab"
import { useOnboarding } from "@/lib/onboarding"
import { FIRESTORE_COLLECTIONS, CENTER_SUBCOLLECTIONS } from "@/lib/firestorePaths"

const TABS = [
  { key: "courts", label: "Canchas" },
  { key: "schedule", label: "Horarios" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export default function CourtsTabsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isOnboarding, completeStep } = useOnboarding()
  const { user, centerId } = useAuth()
  const resolvedCenterId = centerId || user?.uid || null
  const [justCreatedCourtId, setJustCreatedCourtId] = useState<string | null>(null)
  const [courtsStats, setCourtsStats] = useState<{ total: number; published: number }>({ total: 0, published: 0 })
  const [tab, setTabState] = useState<TabKey>("courts")
  const activeTab: TabKey = useMemo(() => (TABS.some((t) => t.key === tab) ? tab : "courts"), [tab])
  const canAdvanceToPublish = courtsStats.total > 0 && courtsStats.published === courtsStats.total

  // Initialize courts stats from Firestore so the "Siguiente: Publicar" button
  // works correctly even when the user lands directly on ?tab=schedule.
  useEffect(() => {
    const fetchStats = async () => {
      if (!resolvedCenterId) return
      try {
        const newRef = collection(db, FIRESTORE_COLLECTIONS.centers, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)
        const legacyRef = collection(db, FIRESTORE_COLLECTIONS.legacyCenters, resolvedCenterId, CENTER_SUBCOLLECTIONS.courts)
        const [newSnap, legacySnap] = await Promise.all([getDocs(newRef), getDocs(legacyRef)])
        const merged = new Map<string, any>()
        legacySnap.docs.forEach((docSnap) => merged.set(docSnap.id, docSnap.data()))
        newSnap.docs.forEach((docSnap) => merged.set(docSnap.id, docSnap.data()))
        const courts = Array.from(merged.values())
        const total = courts.length
        const published = courts.filter((court) => court?.published === true).length
        setCourtsStats({ total, published })
      } catch {
        // Ignore – stats will be updated via onCourtsStatsChange / onCourtPublishChange
      }
    }
    fetchStats()
  }, [resolvedCenterId])

  useEffect(() => {
    const tabFromParams = (searchParams?.get("tab") as TabKey) || "courts"
    setTabState(tabFromParams)
  }, [searchParams])

  const setTab = (next: TabKey) => {
    setTabState(next)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    router.push(url.pathname + url.search)
  }

  const handleCourtCreated = async (courtId: string, courtName: string) => {
    setJustCreatedCourtId(courtId)

    if (isOnboarding) {
      // Complete courts step but keep user here so they can continue configuring horarios.
      await completeStep("courts")
    }

    // Auto-switch to schedule tab after creating a court.
    setTab("schedule")
  }

  const handleCourtPublishChange = (courtId: string, published: boolean) => {
    setCourtsStats((current) => {
      const nextPublished = published
        ? current.published + 1
        : Math.max(0, current.published - 1)
      // Ensure total is at least as large as the new published count (safety guard
      // for when CourtsTab never reported stats because the user landed on ?tab=schedule).
      const nextTotal = Math.max(current.total, nextPublished)
      return { total: nextTotal, published: nextPublished }
    })
  }

  const handleNextOnboardingStep = async () => {
    if (!canAdvanceToPublish) return
    const nextHref = await completeStep("courts")
    if (nextHref) {
      router.push(nextHref)
    }
  }

  return (
    <CourtsLayout
      title="Canchas y Horarios"
      description="Administra todas las canchas de tu complejo y sus franjas horarias disponibles para reservas."
    >
      {isOnboarding && (
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex gap-3 text-sm text-blue-800">
          <span className="text-lg leading-none">🎾</span>
          <p>
            <strong>Creá al menos una cancha</strong> para continuar. Una vez que la guardes, vas a poder enviar tu centro a verificación.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-6 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                activeTab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "courts" ? <CourtsTab onCourtCreated={handleCourtCreated} onCourtsStatsChange={setCourtsStats} /> : null}
      {activeTab === "schedule" ? <ScheduleTab autoSelectCourtId={justCreatedCourtId} onCourtPublishChange={handleCourtPublishChange} /> : null}

      {isOnboarding && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleNextOnboardingStep}
            disabled={!canAdvanceToPublish}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all h-10 px-5 rounded-lg"
          >
            Siguiente: Publicar
          </Button>
        </div>
      )}
    </CourtsLayout>
  )
}
