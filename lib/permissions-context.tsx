"use client"

// ─────────────────────────────────────────────────────────────
//  Permissions Context
//  Loads the current user's team membership from Firestore
//  and exposes helper hooks for permission checks.
//
//  Strategy:
//   • Owner (centerId === user.uid) → always "owner" role
//   • Other users → look up in centers/{centerId}/team/{uid}
//   • Fallback while loading → "owner" (safe default: don't
//     accidentally lock the real club owner out)
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { useAuth } from "@/lib/auth-context"
import {
  type RoleId,
  type ModuleId,
  type RolePermissions,
  type TeamMember,
  type ClubPlanId,
  DEFAULT_ROLE_PERMISSIONS,
  resolvePermissions,
  canView,
  canCreate,
  canEdit,
  canManage,
  planIncludesModule,
} from "@/lib/permissions"

// ── Context shape ────────────────────────────────────────────
interface PermissionsContextValue {
  role: RoleId
  permissions: RolePermissions
  loading: boolean
  /** Current subscription plan (null while loading) */
  plan: ClubPlanId | null
  subscriptionStatus: string | null
  planIncludes: (module: ModuleId) => boolean
  /** Convenience helpers */
  can: {
    view: (module: ModuleId) => boolean
    create: (module: ModuleId) => boolean
    edit: (module: ModuleId) => boolean
    manage: (module: ModuleId) => boolean
  }
}

const PermissionsContext = createContext<PermissionsContextValue>({
  role: "owner",
  permissions: DEFAULT_ROLE_PERMISSIONS.owner,
  loading: true,
  plan: null,
  subscriptionStatus: null,
  planIncludes: () => true,
  can: {
    view: () => true,
    create: () => true,
    edit: () => true,
    manage: () => true,
  },
})

// ── Provider ─────────────────────────────────────────────────
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, centerId, loading: authLoading } = useAuth()
  const [role, setRole] = useState<RoleId>("owner")
  const [permissions, setPermissions] = useState<RolePermissions>(
    DEFAULT_ROLE_PERMISSIONS.owner,
  )
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<ClubPlanId | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || !centerId) {
      setLoading(false)
      return
    }

    // If the user IS the center owner, they always have owner permissions
    if (user.uid === centerId) {
      setRole("owner")
      setPermissions(DEFAULT_ROLE_PERMISSIONS.owner)
      setLoading(false)
      return
    }

    // Real-time listener so permission changes apply immediately
    const memberRef = doc(db, "centers", centerId, "team", user.uid)
    console.log("[Permissions] Subscribing to:", `centers/${centerId}/team/${user.uid}`)
    const unsub = onSnapshot(
      memberRef,
      (snap) => {
        console.log("[Permissions] Snapshot received, exists:", snap.exists())
        if (snap.exists()) {
          const member = snap.data() as TeamMember
          console.log("[Permissions] Role:", member.role, "customPermissions:", !!member.customPermissions)
          setRole(member.role)
          setPermissions(resolvePermissions(member))
        } else {
          // Not found in team → restrict to reception defaults (safe)
          console.log("[Permissions] Doc not found, falling back to reception")
          setRole("reception")
          setPermissions(DEFAULT_ROLE_PERMISSIONS.reception)
        }
        setLoading(false)
      },
      (err) => {
        console.warn("[Permissions] Error reading team doc:", err?.code, err?.message)
        // On error, restrict to reception defaults — never grant owner
        setRole("reception")
        setPermissions(DEFAULT_ROLE_PERMISSIONS.reception)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [user, centerId, authLoading])

  // Real-time plan sync — `centers/{centerId}` is publicly readable
  useEffect(() => {
    if (!centerId) return
    const unsub = onSnapshot(
      doc(db, "centers", centerId),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data()
          setPlan((d.selectedPlan as ClubPlanId) ?? null)
          setSubscriptionStatus(d.subscriptionStatus ?? null)
        }
      },
      () => {},
    )
    return () => unsub()
  }, [centerId])

  const planIncludes = (module: ModuleId) => planIncludesModule(plan, module)

  const can = {
    view:   (module: ModuleId) => canView(permissions, module),
    create: (module: ModuleId) => canCreate(permissions, module),
    edit:   (module: ModuleId) => canEdit(permissions, module),
    manage: (module: ModuleId) => canManage(permissions, module),
  }

  return (
    <PermissionsContext.Provider value={{ role, permissions, loading, plan, subscriptionStatus, planIncludes, can }}>
      {children}
    </PermissionsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────
export function usePermissions() {
  return useContext(PermissionsContext)
}
