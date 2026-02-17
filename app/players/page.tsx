export const metadata = {
  title: "Área de jugadores - Courtly",
  description: "Tu espacio para reservar, encontrar partidos y jugar más",
}

export default function PlayersHomePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Área de jugadores</h1>
        <p className="text-muted-foreground">Pronto tendrás tu panel con reservas y partidos.</p>
      </div>
    </main>
  )
}
