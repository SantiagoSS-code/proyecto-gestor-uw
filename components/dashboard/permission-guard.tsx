"use client"

// ─────────────────────────────────────────────────────────────
//  PermissionGuard
//  Wrap a page with this component to redirect users that
//  don't have at least "view" permission on the given module.
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/lib/permissions-context"
import type { ModuleId } from "@/lib/permissions"

interface PermissionGuardProps {
  module: ModuleId
  children: React.ReactNode
  /** Where to redirect if access is denied. Default: /clubos/dashboard */
  redirectTo?: string
}

export function PermissionGuard({
  module,
  children,
  redirectTo = "/clubos/dashboard",
}: PermissionGuardProps) {
  const { can, loading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !can.view(module)) {
      router.replace(redirectTo)
    }
  }, [loading, can, module, router, redirectTo])

  // While loading, render nothing (avoids flash)
  if (loading) return null

  // If no view permission, render nothing (redirect fires above)
  if (!can.view(module)) return null

  return <>{children}</>
}
