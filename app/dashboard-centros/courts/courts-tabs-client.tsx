"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CourtsLayout } from "@/components/dashboard/courts-layout"
import { Button } from "@/components/ui/button"
import { ClubProfileTab } from "@/components/dashboard/center/club-profile-tab"
import { CourtsTab } from "@/components/dashboard/center/courts-tab"
import { ScheduleTab } from "@/components/dashboard/center/schedule-tab"

const TABS = [
  { key: "profile", label: "Perfil del club" },
  { key: "courts", label: "Canchas" },
  { key: "schedule", label: "Horarios" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export default function CourtsTabsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tab = (searchParams.get("tab") as TabKey) || "profile"
  const activeTab: TabKey = useMemo(() => (TABS.some((t) => t.key === tab) ? tab : "profile"), [tab])

  const setTab = (next: TabKey) => {
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    router.push(url.pathname + url.search)
  }

  return (
    <CourtsLayout
      title="Configuración del club"
      description="Administra el perfil público de tu club, canchas y horarios. Esto se muestra en las páginas de /clubs."
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={activeTab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
            className={activeTab === t.key ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {activeTab === "profile" ? <ClubProfileTab /> : null}
      {activeTab === "courts" ? <CourtsTab /> : null}
      {activeTab === "schedule" ? <ScheduleTab /> : null}
    </CourtsLayout>
  )
}
