import { MembershipsShell } from "@/components/dashboard/memberships/memberships-shell"
import { MembershipsOverview } from "@/components/dashboard/memberships/memberships-overview"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function MembershipsPage() {
  return (
    <PermissionGate module="memberships">
      <MembershipsShell>
        <MembershipsOverview />
      </MembershipsShell>
    </PermissionGate>
  )
}
