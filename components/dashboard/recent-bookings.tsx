"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays } from "lucide-react"

interface BookingRow {
  id: string
  customer: string
  time: string
  court: string
  amount: string
  status: string
  statusVariant: "default" | "secondary" | "destructive" | "outline"
}

interface RecentBookingsProps {
  bookings: BookingRow[]
}

export function RecentBookings({ bookings }: RecentBookingsProps) {
  if (bookings.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center justify-center text-center">
        <CalendarDays className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-600">No hay próximas reservas</p>
        <p className="text-xs text-slate-500 mt-1">Cuando se generen nuevas reservas aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="border-none hover:bg-transparent">
            <TableHead className="w-[80px] text-black">Hora</TableHead>
            <TableHead className="text-black">Cliente</TableHead>
            <TableHead className="text-black">Cancha</TableHead>
            <TableHead className="text-black">Estado</TableHead>
            <TableHead className="text-right text-black">Importe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id} className="border-b-muted/50 hover:bg-muted/30">
              <TableCell className="font-medium text-sm text-black">{booking.time}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                   <Avatar className="h-6 w-6">
                        <AvatarImage src={`https://avatar.vercel.sh/${booking.customer}`} />
                        <AvatarFallback>{booking.customer[0]}</AvatarFallback>
                   </Avatar>
                   <span className="text-sm font-medium text-black">{booking.customer}</span>
                </div>
              </TableCell>
              <TableCell className="text-black text-sm">{booking.court}</TableCell>
              <TableCell>
                <Badge variant={booking.statusVariant as any} className="font-normal">{booking.status}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium text-sm text-black">{booking.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
