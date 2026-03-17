import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { PromotionsOverview } from "@/components/dashboard/promotions/promotions-overview"

export default function PromotionsPage() {
  return (
    <PromotionsShell>
      <PromotionsOverview />
    </PromotionsShell>
  )
}
