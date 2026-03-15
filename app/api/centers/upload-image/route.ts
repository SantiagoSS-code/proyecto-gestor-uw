import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { adminAuth, getAdminStorage, getAdminStorageBucketCandidates } from "@/lib/firebase/admin"

export const runtime = "nodejs"

function extensionFromMime(mime: string | null) {
  if (!mime) return "jpg"
  if (mime.includes("png")) return "png"
  if (mime.includes("webp")) return "webp"
  if (mime.includes("gif")) return "gif"
  return "jpg"
}

function isBucketMissingError(error: any) {
  const message = String(error?.message || "").toLowerCase()
  const code = String(error?.code || "").toLowerCase()
  return message.includes("specified bucket does not exist") || code.includes("bucket-not-found")
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

    const bytes = Buffer.from(await file.arrayBuffer())
    const downloadToken = randomUUID()

    const storage = getAdminStorage()
    const bucketCandidates = getAdminStorageBucketCandidates()

    let uploadedBucketName = ""
    let lastError: any = null

    for (const bucketName of bucketCandidates) {
      try {
        const bucket = storage.bucket(bucketName)
        const bucketFile = bucket.file(objectPath)

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

        uploadedBucketName = bucket.name
        break
      } catch (error: any) {
        lastError = error
        if (!isBucketMissingError(error)) {
          throw error
        }
      }
    }

    if (!uploadedBucketName) {
      throw lastError || new Error("No se pudo subir la imagen a ningún bucket configurado.")
    }

    const encodedPath = encodeURIComponent(objectPath)
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${uploadedBucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`

    return NextResponse.json({ imageUrl, path: objectPath })
  } catch (error: any) {
    console.error("[upload-image] error", error)
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 })
  }
}
