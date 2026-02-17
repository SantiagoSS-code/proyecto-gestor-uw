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

const bookings = [
  {
    id: "INV001",
    customer: "Martin Berasategui",
    time: "18:00 - 19:30",
    court: "Cancha 1",
    amount: "$24.00",
    status: "Confirmada",
    statusVariant: "default",
    type: "Padel",
  },
  {
    id: "INV002",
    customer: "Carolina Marin",
    time: "19:00 - 20:00",
    court: "Cancha 3",
    amount: "$18.00",
    status: "Pendiente",
    statusVariant: "secondary",
    type: "Tenis",
  },
  {
    id: "INV003",
    customer: "Rafa Nadal",
    time: "20:00 - 21:30",
    court: "Cancha 2",
    amount: "$32.00",
    status: "Confirmada",
    statusVariant: "default",
    type: "Padel",
  },
  {
    id: "INV004",
    customer: "Carlos Alcaraz",
    time: "10:00 - 11:30",
    court: "Cancha 1",
    amount: "$24.00",
    status: "Cancelada",
    statusVariant: "destructive",
    type: "Padel",
  },
]

export function RecentBookings() {
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
