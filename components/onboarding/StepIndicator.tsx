interface StepIndicatorProps {
  step: number
  total: number
  title?: string
}

export function StepIndicator({ step, total, title }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-black">Paso {step} de {total}</p>
        {title && (
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, index) => {
          const isActive = index + 1 <= step
          return (
            <span
              key={index}
              className={`h-1.5 w-10 rounded-full transition-colors ${
                isActive ? "bg-primary" : "bg-muted"
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
