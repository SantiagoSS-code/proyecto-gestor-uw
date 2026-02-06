"use client"

import { useBackofficeAuth } from "@/lib/backoffice/auth-context"

export default function BackofficeOverviewPage() {
  const { user, loading } = useBackofficeAuth()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Backoffice OK</h1>
        <p className="text-sm text-slate-600 mt-1">You are signed in to the backoffice project.</p>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {loading ? "Loading admin session…" : `Admin: ${user?.email || "Unknown"}`}
      </div>
    </div>
  )
}
