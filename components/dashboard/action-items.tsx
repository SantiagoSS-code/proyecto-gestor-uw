import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Clock, MessageSquare, ArrowRight } from "lucide-react"

const messages = [
  { sender: "Alice Cooper", preview: "¿La Cancha 3 está disponible 2 horas?", time: "Hace 5m", unread: true },
  { sender: "Bob Wilson", preview: "¡Gracias por el gran servicio!", time: "Hace 1h", unread: false },
  { sender: "Charlie Brown", preview: "Necesito cancelar mi reserva de mañana.", time: "Hace 3h", unread: false },
]

const tasks = [
  { text: "Confirmar solicitud de reserva #2024", done: false, priority: "High" },
  { text: "Revisar red en Cancha 2", done: false, priority: "Medium" },
  { text: "Reponer bebidas en la heladera", done: true, priority: "Low" },
]

export function ActionItems() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Mensajes */}
      <Card className="border-none shadow-sm h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Mensajes recientes</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs">Ver todo</Button>
          </div>
          <CardDescription className="text-black">3 mensajes nuevos hoy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 group cursor-pointer">
                 <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-black" />
                    </div>
                     {msg.unread && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                     )}
                 </div>
                 <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{msg.sender}</p>
                        <span className="text-xs text-black">{msg.time}</span>
                    </div>
                      <p className="text-xs text-black line-clamp-1">{msg.preview}</p>
                 </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4" />
                 </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tareas */}
      <Card className="border-none shadow-sm h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Tareas</CardTitle>
             <Button variant="ghost" size="sm" className="h-8 text-xs">Ver todo</Button>
          </div>
           <CardDescription className="text-black">2 tareas pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
             {tasks.map((task, i) => (
                 <div key={i} className="flex items-start gap-3 group">
                    <button className="mt-0.5 text-black hover:text-primary transition-colors">
                        {task.done ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <Circle className="h-5 w-5" />
                        )}
                    </button>
                    <div className="flex-1">
                        <p className={`text-sm ${task.done ? 'line-through text-black' : 'font-medium'}`}>
                            {task.text}
                        </p>
                    </div>
                    {task.priority === "High" && !task.done && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Alta</Badge>
                    )}
                 </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
