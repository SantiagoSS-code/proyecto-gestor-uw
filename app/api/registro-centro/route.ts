import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"
import { slugify } from "@/lib/utils"

// Map day names to integers (0 = Sunday, 1 = Monday, etc.)
const dayNameToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { isGoogleUser, userId, email, password, adminData, centerData, centerHours, imageUrl, centerImageUrl } = body

    const resolvedImageUrl = imageUrl ?? centerImageUrl ?? null

    const openingHours: Record<string, { open: string; close: string; closed: boolean }> = {}
    if (Array.isArray(centerHours)) {
      for (const h of centerHours) {
        const dayKey = String(h?.day ?? "")
        const dayNum = dayNameToNumber[dayKey]
        if (typeof dayNum !== "number") continue
        openingHours[String(dayNum)] = {
          open: String(h?.openTime ?? "07:00"),
          close: String(h?.closeTime ?? "23:00"),
          closed: !Boolean(h?.isOpen),
        }
      }
    }

    const ensureUniqueSlug = async (name: string, centerId: string) => {
      const base = slugify(name)
      let candidate = base || `club-${centerId.slice(0, 6)}`
      const existing = await adminDb.collection("centers").where("slug", "==", candidate).limit(1).get()
      if (!existing.empty && existing.docs[0]?.id !== centerId) {
        candidate = `${candidate}-${centerId.slice(0, 6)}`
      }
      return candidate
    }

    if (isGoogleUser) {
      // For Google users, user is already created, just add data
      if (!userId || !adminData || !centerData) {
        return NextResponse.json({ error: "Missing required data for Google user" }, { status: 400 })
      }

      const slug = await ensureUniqueSlug(centerData.name, userId)

      // Create center document
      const centerRef = adminDb.collection('padel_centers').doc(userId)
      await centerRef.set({
        name: centerData.name,
        email: centerData.email,
        phone: centerData.phone,
        address: `${centerData.street} ${centerData.number}, ${centerData.city}, ${centerData.province}`,
        city: centerData.city,
        country: centerData.province, // Using province as country for now
        plan: 'free', // Default plan
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: true,
        imageUrl: resolvedImageUrl,
      })

      // Mirror for public /clubs (new model)
      const clubsCenterRef = adminDb.collection("centers").doc(userId)
      await clubsCenterRef.set(
        {
          name: centerData.name,
          email: centerData.email,
          phone: centerData.phone,
          address: `${centerData.street} ${centerData.number}, ${centerData.city}, ${centerData.province}`,
          city: centerData.city,
          country: centerData.province,
          description: "",
          amenities: [],
          sports: ["padel"],
          coverImageUrl: resolvedImageUrl,
          galleryImageUrls: resolvedImageUrl ? [resolvedImageUrl] : [],
          slug,
          published: true,
          featuredRank: null,
          topSearchedRank: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      )

      // Initial booking settings (new path)
      await adminDb
        .collection("centers")
        .doc(userId)
        .collection("settings")
        .doc("booking")
        .set(
          {
            timezone: "Europe/Madrid",
            slotDurationMinutes: 60,
            openingHours,
            updatedAt: new Date(),
          },
          { merge: true }
        )

      // Create admin document
      const adminRef = adminDb.collection('center_admins').doc(userId)
      await adminRef.set({
        first_name: adminData.firstName,
        last_name: adminData.lastName,
        email: adminData.email,
        phone: adminData.phone,
        centerId: userId,
        createdAt: new Date(),
      })

      // Create/merge user role doc for RBAC
      await adminDb
        .collection("users")
        .doc(userId)
        .set(
          {
            role: "center_admin",
            centerId: userId,
            email: (email || adminData?.email || centerData?.email || "").toLowerCase(),
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        )

      return NextResponse.json({ success: true, message: "Center registered successfully" })
    } else {
      // For email/password users, create auth user first
      if (!email || !password || !adminData || !centerData) {
        return NextResponse.json({ error: "Missing required data" }, { status: 400 })
      }

      // Create user in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: `${adminData.firstName} ${adminData.lastName}`,
      })

      const slug = await ensureUniqueSlug(centerData.name, userRecord.uid)

      // Create center document
      const centerRef = adminDb.collection('padel_centers').doc(userRecord.uid)
      await centerRef.set({
        name: centerData.name,
        email: centerData.email,
        phone: centerData.phone,
        address: `${centerData.street} ${centerData.number}, ${centerData.city}, ${centerData.province}`,
        city: centerData.city,
        country: centerData.province,
        plan: 'free',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: true,
        imageUrl: resolvedImageUrl,
      })

      // Mirror for public /clubs (new model)
      const clubsCenterRef = adminDb.collection("centers").doc(userRecord.uid)
      await clubsCenterRef.set(
        {
          name: centerData.name,
          email: centerData.email,
          phone: centerData.phone,
          address: `${centerData.street} ${centerData.number}, ${centerData.city}, ${centerData.province}`,
          city: centerData.city,
          country: centerData.province,
          description: "",
          amenities: [],
          sports: ["padel"],
          coverImageUrl: resolvedImageUrl,
          galleryImageUrls: resolvedImageUrl ? [resolvedImageUrl] : [],
          slug,
          published: true,
          featuredRank: null,
          topSearchedRank: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      )

      // Initial booking settings (new path)
      await adminDb
        .collection("centers")
        .doc(userRecord.uid)
        .collection("settings")
        .doc("booking")
        .set(
          {
            timezone: "Europe/Madrid",
            slotDurationMinutes: 60,
            openingHours,
            updatedAt: new Date(),
          },
          { merge: true }
        )

      // Create admin document
      const adminRef = adminDb.collection('center_admins').doc(userRecord.uid)
      await adminRef.set({
        first_name: adminData.firstName,
        last_name: adminData.lastName,
        email: adminData.email,
        phone: adminData.phone,
        centerId: userRecord.uid,
        createdAt: new Date(),
      })

      // Create/merge user role doc for RBAC
      await adminDb
        .collection("users")
        .doc(userRecord.uid)
        .set(
          {
            role: "center_admin",
            centerId: userRecord.uid,
            email: String(email).toLowerCase(),
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        )

      return NextResponse.json({ success: true, message: "Center registered successfully" })
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 })
  }
}
