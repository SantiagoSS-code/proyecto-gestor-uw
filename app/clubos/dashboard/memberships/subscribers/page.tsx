import { MembershipsShell } from "@/components/dashboard/memberships/memberships-shell"
import { SubscribersManager } from "@/components/dashboard/memberships/subscribers-manager"

export default function MembershipsSubscribersPage() {
  return (
    <MembershipsShell>
      <SubscribersManager />
    </MembershipsShell>
  )
}
