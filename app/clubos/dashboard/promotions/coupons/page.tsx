import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { CouponsManager } from "@/components/dashboard/promotions/coupons-manager"

export default function CouponsPage() {
  return (
    <PromotionsShell>
      <CouponsManager />
    </PromotionsShell>
  )
}
