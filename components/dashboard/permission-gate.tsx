"use client"

import { usePermissions } from "@/lib/permissions-context"
import type { ModuleId } from "@/lib/permissions"
import { ShieldAlert } from "lucide-react"

/**
 * Wraps a page's content and blocks rendering if the current user
 * doesn't have at least "view" permission on the given module.
 */
export function PermissionGate({
  module,
  children,
}: {
  module: ModuleId
  children: React.ReactNode
}) {
  const { can, loading } = usePermissions()

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!can.view(module)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sin acceso</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            No tenés permisos para ver esta sección. Contactá al administrador del club si necesitás acceso.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
