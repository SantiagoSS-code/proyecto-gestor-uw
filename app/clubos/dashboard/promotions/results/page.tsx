import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { PromotionsResults } from "@/components/dashboard/promotions/promotions-results"

export default function ResultsPage() {
  return (
    <PromotionsShell>
      <PromotionsResults />
    </PromotionsShell>
  )
}
