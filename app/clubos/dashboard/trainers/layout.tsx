import { TrainersNav } from "@/components/dashboard/trainers/trainers-nav"

export default function TrainersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TrainersNav />
      {children}
    </div>
  )
}
