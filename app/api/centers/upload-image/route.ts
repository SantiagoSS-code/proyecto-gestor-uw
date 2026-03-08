import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { adminAuth, getAdminStorageBucket } from "@/lib/firebase/admin"

export const runtime = "nodejs"

function extensionFromMime(mime: string | null) {
  if (!mime) return "jpg"
  if (mime.includes("png")) return "png"
  if (mime.includes("webp")) return "webp"
  if (mime.includes("gif")) return "gif"
  return "jpg"
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(token)
    const form = await request.formData()

    const centerId = String(form.get("centerId") || "")
    const kind = String(form.get("kind") || "cover")
    const file = form.get("file")

    if (!centerId || decoded.uid !== centerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    const ext = extensionFromMime(file.type)
    const safeKind = kind === "logo" ? "logo" : "cover"
    const objectPath = `centers/${centerId}/${safeKind}-${Date.now()}.${ext}`

    const bucket = getAdminStorageBucket()
    const bucketFile = bucket.file(objectPath)

    const bytes = Buffer.from(await file.arrayBuffer())
    const downloadToken = randomUUID()

    await bucketFile.save(bytes, {
      metadata: {
        contentType: file.type,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
      resumable: false,
      public: false,
    })

    const encodedPath = encodeURIComponent(objectPath)
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`

    return NextResponse.json({ imageUrl, path: objectPath })
  } catch (error: any) {
    console.error("[upload-image] error", error)
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 })
  }
}
