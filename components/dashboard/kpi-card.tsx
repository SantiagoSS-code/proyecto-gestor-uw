import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  description?: string
}

export function KpiCard({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  description,
}: KpiCardProps) {
  return (
    <Card className="border-none shadow-sm bg-card/60 hover:bg-card/100 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-black">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-black" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <p className="text-xs text-black mt-1 flex items-center gap-1">
             {trend && (
                 <span className={cn(
                     "font-medium",
                     trendUp ? "text-emerald-500" : "text-rose-500"
                 )}>
                    {trend}
                 </span>
             )}
            <span className="opacity-80 ml-1">{description}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
