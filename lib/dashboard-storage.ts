// ─────────────────────────────────────────────────────────────
//  Dashboard Customization – localStorage persistence
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "voyd_dashboard_widgets"

export const MAX_WIDGETS = 25

/**
 * Read saved widget IDs from localStorage.
 * Returns `null` when nothing has been saved yet (first visit).
 */
export function loadSavedWidgets(): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Persist widget IDs to localStorage. */
export function saveWidgets(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_WIDGETS)))
  } catch {
    // quota exceeded – silently fail
  }
}
