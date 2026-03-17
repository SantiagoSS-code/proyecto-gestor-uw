import { MembershipsShell } from "@/components/dashboard/memberships/memberships-shell"
import { PlansManager } from "@/components/dashboard/memberships/plans-manager"

export default function MembershipsPlansPage() {
  return (
    <MembershipsShell>
      <PlansManager />
    </MembershipsShell>
  )
}
