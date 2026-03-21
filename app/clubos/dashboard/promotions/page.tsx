import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { PromotionsOverview } from "@/components/dashboard/promotions/promotions-overview"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function PromotionsPage() {
  return (
    <PermissionGate module="promotions">
      <PromotionsShell>
        <PromotionsOverview />
      </PromotionsShell>
    </PermissionGate>
  )
}
