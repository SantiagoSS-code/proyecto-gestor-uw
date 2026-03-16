import { CoursesNav } from "@/components/dashboard/courses/courses-nav"

export default function CursosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CoursesNav />
      {children}
    </div>
  )
}
