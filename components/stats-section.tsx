export function StatsSection() {
  const stats = [
    { value: "4M+", label: "Active Players", company: "Worldwide" },
    { value: "8,500+", label: "Partner Clubs", company: "60+ Countries" },
    { value: "150K+", label: "Matches Daily", company: "Growing Fast" },
    { value: "4.9★", label: "App Rating", company: "App Store" },
  ]

  return (
    <section className="py-16 border-y border-border bg-card/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center md:text-left md:border-l md:first:border-l-0 border-border md:pl-8 md:first:pl-0"
            >
              <p className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-muted-foreground">{stat.label}</p>
              <p className="text-sm text-primary font-medium mt-1">{stat.company}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
