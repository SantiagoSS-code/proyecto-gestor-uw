import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"

type BookingRecord = {
  id: string
  customerEmail?: string
  email?: string
  customerName?: string
  customer?: string
  customerPhone?: string
  phone?: string
  date?: string | Date
  dateKey?: string
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

    const loadBookings = async (rootCollection: "centers" | "padel_centers", subCollection: string) => {
      try {
        const snapshot = await adminDb
          .collection(rootCollection)
          .doc(centerId)
          .collection(subCollection)
          .get()

        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BookingRecord[]
      } catch {
        return [] as BookingRecord[]
      }
    }

    // New model + legacy model
    const [newBookings, legacyBookingRequests, legacyBookings] = await Promise.all([
      loadBookings("centers", "bookings"),
      loadBookings("padel_centers", "booking_requests"),
      loadBookings("padel_centers", "bookings"),
    ])

    // Aggregate customers from both collections
    const customersMap = new Map<string, CustomerAggregate>()

    const allBookings = [...newBookings, ...legacyBookingRequests, ...legacyBookings]

    allBookings.forEach((booking) => {
      const email = (booking.customerEmail || booking.email || "").toLowerCase()
      if (!email) return

      const existingCustomer =
        customersMap.get(email) ||
        createCustomerAggregate(
          email,
          booking.customerName || booking.customer || "Sin nombre",
          booking.customerPhone || booking.phone || undefined
        )

      existingCustomer.totalReservations += 1
      existingCustomer.totalSpent += booking.price || 0

      const dateValue = booking.date || booking.dateKey
      if (dateValue) {
        const dateObj = dateValue instanceof Date ? dateValue : new Date(dateValue)
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
