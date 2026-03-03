import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { getAuth } from "firebase-admin/auth"

type BookingRecord = {
  id: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  date?: string | Date
  price?: number
}

type CustomerAggregate = {
  email: string
  name: string
  phone?: string
  totalReservations: number
  lastReservationDate?: Date
  totalSpent: number
  reservationDates: Date[]
}

function createCustomerAggregate(
  email: string,
  name: string,
  phone?: string
): CustomerAggregate {
  return {
    email,
    name,
    phone,
    totalReservations: 0,
    totalSpent: 0,
    reservationDates: [],
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get("centerId")

    if (!centerId) {
      return NextResponse.json({ error: "Missing centerId" }, { status: 400 })
    }

    // Get all bookings for the center
    const bookingsRef = adminDb
      .collection("padel_centers")
      .doc(centerId)
      .collection("booking_requests")

    const bookingsSnapshot = await bookingsRef.get()
    const bookings: BookingRecord[] = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BookingRecord[]

    // Also check for confirmed bookings in the "bookings" subcollection
    const confirmedBookingsRef = adminDb
      .collection("padel_centers")
      .doc(centerId)
      .collection("bookings")

    const confirmedSnapshot = await confirmedBookingsRef.get()
    const confirmedBookings: BookingRecord[] = confirmedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BookingRecord[]

    // Aggregate customers from both collections
    const customersMap = new Map<string, CustomerAggregate>()

    // Process booking requests
    bookings.forEach((booking) => {
      const email = booking.customerEmail?.toLowerCase() || ""
      if (!email) return

      const existingCustomer =
        customersMap.get(email) ||
        createCustomerAggregate(email, booking.customerName || "Sin nombre", booking.customerPhone || undefined)

      existingCustomer.totalReservations += 1
      existingCustomer.totalSpent += booking.price || 0

      if (booking.date) {
        const dateObj = booking.date instanceof Date ? booking.date : new Date(booking.date)
        existingCustomer.reservationDates.push(dateObj)
      }

      customersMap.set(email, existingCustomer)
    })

    // Process confirmed bookings
    confirmedBookings.forEach((booking) => {
      const email = booking.customerEmail?.toLowerCase() || ""
      if (!email) return

      const existingCustomer =
        customersMap.get(email) ||
        createCustomerAggregate(email, booking.customerName || "Sin nombre", booking.customerPhone || undefined)

      existingCustomer.totalReservations += 1
      existingCustomer.totalSpent += booking.price || 0

      if (booking.date) {
        const dateObj = booking.date instanceof Date ? booking.date : new Date(booking.date)
        existingCustomer.reservationDates.push(dateObj)
      }

      customersMap.set(email, existingCustomer)
    })

    // Calculate last reservation date and sort by it
    const customers = Array.from(customersMap.values())
      .map((customer) => ({
        ...customer,
        lastReservationDate:
          customer.reservationDates.length > 0
            ? new Date(Math.max(...customer.reservationDates.map((d) => d.getTime())))
            : null,
      }))
      .sort(
        (a, b) =>
          (b.lastReservationDate?.getTime() || 0) - (a.lastReservationDate?.getTime() || 0)
      )

    return NextResponse.json({ customers, total: customers.length })
  } catch (error: any) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
