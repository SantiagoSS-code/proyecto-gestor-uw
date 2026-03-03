import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"

type BookingRecord = {
  id: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  status?: string
  date?: string
  dateKey?: string
  time?: string
  court?: string
  courtId?: string
  courtName?: string
  duration?: number
  durationMinutes?: number
  price?: number
}

export async function GET(request: Request, { params }: { params: { email: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get("centerId")
    const email = decodeURIComponent(params.email)

    if (!centerId || !email) {
      return NextResponse.json({ error: "Missing centerId or email" }, { status: 400 })
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

    // Combine all bookings
    const allBookings = [...bookings, ...confirmedBookings]

    // Filter bookings for the specific customer email
    const customerBookings = allBookings.filter(
      (booking) => booking.customerEmail?.toLowerCase() === email.toLowerCase()
    )

    if (customerBookings.length === 0) {
      return NextResponse.json({
        email,
        name: "",
        phone: "",
        totalReservations: 0,
        totalSpent: 0,
        totalIncome: 0,
        averageFrequency: 0,
        favoriteCourt: null,
        mostUsedTime: null,
        cancelledReservations: 0,
        reservations: [],
        internalNotes: "",
      })
    }

    // Calculate statistics
    const totalReservations = customerBookings.length
    const totalSpent = customerBookings.reduce((sum, b) => sum + (b.price || 0), 0)

    // Get customer info from first booking
    const customerInfo = customerBookings[0]
    const customerName = customerInfo.customerName || ""
    const customerPhone = customerInfo.customerPhone || ""

    // Calculate cancelled reservations
    const cancelledReservations = customerBookings.filter(
      (b) => b.status === "cancelada" || b.status === "cancelled"
    ).length

    // Calculate average frequency (days between reservations)
    const reservationDates = customerBookings
      .filter((b) => b.date || b.dateKey)
      .map((b) => {
        const dateStr = b.date || b.dateKey || ""
        return new Date(dateStr).getTime()
      })
      .sort((a, b) => a - b)

    let averageFrequency = 0
    if (reservationDates.length > 1) {
      const intervals = []
      for (let i = 1; i < reservationDates.length; i++) {
        intervals.push((reservationDates[i] - reservationDates[i - 1]) / (1000 * 60 * 60 * 24))
      }
      averageFrequency = intervals.reduce((a, b) => a + b, 0) / intervals.length
    }

    // Find favorite court (most booked)
    const courtCounts = new Map<string, number>()
    customerBookings.forEach((b) => {
      const courtId = b.court || b.courtId
      if (courtId) {
        courtCounts.set(courtId, (courtCounts.get(courtId) || 0) + 1)
      }
    })

    let favoriteCourt = null
    let maxCount = 0
    courtCounts.forEach((count, courtId) => {
      if (count > maxCount) {
        maxCount = count
        favoriteCourt = {
          id: courtId,
          name: customerBookings.find((b) => (b.court || b.courtId) === courtId)?.courtName || courtId,
          bookingCount: count,
        }
      }
    })

    // Find most used time slot
    const timeCounts = new Map<string, number>()
    customerBookings.forEach((b) => {
      const time = b.time
      if (time) {
        timeCounts.set(time, (timeCounts.get(time) || 0) + 1)
      }
    })

    let mostUsedTime = null
    let maxTimeCount = 0
    timeCounts.forEach((count, time) => {
      if (count > maxTimeCount) {
        maxTimeCount = count
        mostUsedTime = {
          time,
          bookingCount: count,
        }
      }
    })

    // Format reservations for response
    const reservations = customerBookings
      .map((b) => ({
        id: b.id,
        court: b.court || b.courtId,
        courtName: b.courtName,
        date: b.date || b.dateKey || "",
        time: b.time,
        duration: b.duration || b.durationMinutes,
        price: b.price || 0,
        status: b.status || "pending",
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
      })

    return NextResponse.json({
      email,
      name: customerName,
      phone: customerPhone,
      totalReservations,
      totalSpent,
      totalIncome: totalSpent,
      averageFrequency: Math.round(averageFrequency * 10) / 10, // Round to 1 decimal
      favoriteCourt,
      mostUsedTime,
      cancelledReservations,
      reservations,
      internalNotes: "",
    })
  } catch (error: any) {
    console.error("Error fetching customer details:", error)
    return NextResponse.json({ error: "Failed to fetch customer details" }, { status: 500 })
  }
}
