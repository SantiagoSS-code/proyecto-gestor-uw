"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CourtsLayout } from "@/components/dashboard/courts-layout"
import { cn } from "@/lib/utils"
import { CourtsTab } from "@/components/dashboard/center/courts-tab"
import { ScheduleTab } from "@/components/dashboard/center/schedule-tab"
import { useOnboarding } from "@/lib/onboarding"

const TABS = [
  { key: "courts", label: "Canchas" },
  { key: "schedule", label: "Horarios" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export default function CourtsTabsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isOnboarding, completeStep } = useOnboarding()
  const [justCreatedCourtId, setJustCreatedCourtId] = useState<string | null>(null)
  const [tab, setTabState] = useState<TabKey>("courts")
  const activeTab: TabKey = useMemo(() => (TABS.some((t) => t.key === tab) ? tab : "courts"), [tab])

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
      // Complete courts step and redirect to Centro for publish
      const nextHref = await completeStep("courts")
      if (nextHref) {
        router.push(nextHref)
        return
      }
    }

    // Normal flow: auto-switch to schedule tab
    setTab("schedule")
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

      {activeTab === "courts" ? <CourtsTab onCourtCreated={handleCourtCreated} /> : null}
      {activeTab === "schedule" ? <ScheduleTab autoSelectCourtId={justCreatedCourtId} /> : null}
    </CourtsLayout>
  )
}
