import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

export interface PlayerOnboardingStatus {
  exists: boolean
  onboardingCompleted: boolean
  uid: string
  docPath: string
}

/**
 * Get player onboarding status from Firestore
 * Uses Firebase Auth UID as the primary key at path: players/{uid}
 */
export async function getPlayerOnboardingStatus(
  uid: string
): Promise<PlayerOnboardingStatus> {
  const docPath = `players/${uid}`
  
  console.info("[getPlayerOnboardingStatus] checking", { uid, docPath })
  
  try {
    const playerRef = doc(db, "players", uid)
    const playerSnap = await getDoc(playerRef)
    const exists = playerSnap.exists()
    const data = playerSnap.data() || {}
    const onboardingCompleted = data.onboardingCompleted === true
    
    console.info("[getPlayerOnboardingStatus] result", {
      uid,
      docPath,
      exists,
      onboardingCompleted,
      rawOnboardingCompleted: data.onboardingCompleted,
      hasData: Object.keys(data).length > 0,
    })
    
    return {
      exists,
      onboardingCompleted,
      uid,
      docPath,
    }
  } catch (error) {
    console.error("[getPlayerOnboardingStatus] error", { uid, docPath, error })
    throw error
  }
}

/**
 * Create a minimal player profile for new users
 */
export async function createMinimalPlayerProfile(
  uid: string,
  email: string
): Promise<void> {
  const docPath = `players/${uid}`
  
  console.info("[createMinimalPlayerProfile] creating", { uid, email, docPath })
  
  await setDoc(
    doc(db, "players", uid),
    {
      uid,
      email: email.toLowerCase().trim(),
      createdAt: serverTimestamp(),
      onboardingCompleted: false,
    },
    { merge: true }
  )
  
  console.info("[createMinimalPlayerProfile] created", { uid, docPath })
}
