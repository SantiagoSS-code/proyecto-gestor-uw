import { cn } from "@/lib/utils"

interface RadioOption {
  label: string
  value: string
  description?: string
}

interface RadioGroupCardProps {
  label: string
  value: string | null
  options: RadioOption[]
  onChange: (value: string) => void
}

export function RadioGroupCard({ label, value, options, onChange }: RadioGroupCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{label}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "group relative w-full rounded-2xl border px-4 py-4 text-left transition-all",
                "hover:border-foreground/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  {option.description && (
                    <p className="mt-1 text-xs text-black">{option.description}</p>
                  )}
                </div>
                <div
                  className={cn(
                    "mt-0.5 h-4 w-4 rounded-full border transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
