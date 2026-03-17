import { MembershipsShell } from "@/components/dashboard/memberships/memberships-shell"
import { BenefitsManager } from "@/components/dashboard/memberships/benefits-manager"

export default function MembershipsBenefitsPage() {
  return (
    <MembershipsShell>
      <BenefitsManager />
    </MembershipsShell>
  )
}
