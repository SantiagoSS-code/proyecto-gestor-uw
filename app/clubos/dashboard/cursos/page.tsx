import { CoursesOverview } from "@/components/dashboard/courses/courses-overview"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function CursosPage() {
  return (
    <PermissionGate module="courses">
      <CoursesOverview />
    </PermissionGate>
  )
}
