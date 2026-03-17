/**
 * lib/tournaments.ts
 * Full data-access layer for the Tournaments module.
 * Mirrors the pattern of lib/promotions.ts and lib/memberships.ts.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  increment,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { TOURNAMENTS_COLLECTIONS } from "@/lib/firestorePaths"
import type {
  TournamentDoc,
  TournamentRegistrationDoc,
  TournamentMatchDoc,
  TournamentStandingDoc,
  TournamentStatus,
  TournamentRegistrationStatus,
  TournamentFormat,
  TournamentParticipant,
} from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = (name: string) => collection(db, name)

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// ─── Tournaments CRUD ──────────────────────────────────────────────────────────

export async function getTournaments(clubId: string): Promise<TournamentDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.tournaments),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentDoc))
}

export async function getTournamentById(id: string): Promise<TournamentDoc | null> {
  const snap = await getDoc(doc(db, TOURNAMENTS_COLLECTIONS.tournaments, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as TournamentDoc
}

export async function getTournamentBySlug(
  clubId: string,
  slug: string,
): Promise<TournamentDoc | null> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.tournaments),
    where("clubId", "==", clubId),
    where("slug", "==", slug),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as TournamentDoc
}

/** Public: returns published tournaments for a club */
export async function getPublicTournaments(clubId: string): Promise<TournamentDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.tournaments),
    where("clubId", "==", clubId),
    where("visibility", "==", "public"),
    where("status", "in", ["published", "registration_closed", "in_progress", "finished"]),
    orderBy("tournamentStartAt", "asc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentDoc))
}

export async function createTournament(
  data: Omit<TournamentDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const slug = data.slug || slugify(data.name)
  const ref = await addDoc(col(TOURNAMENTS_COLLECTIONS.tournaments), {
    ...data,
    slug,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTournament(
  id: string,
  data: Partial<TournamentDoc>,
): Promise<void> {
  await updateDoc(doc(db, TOURNAMENTS_COLLECTIONS.tournaments, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function setTournamentStatus(
  id: string,
  status: TournamentStatus,
): Promise<void> {
  await updateDoc(doc(db, TOURNAMENTS_COLLECTIONS.tournaments, id), {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTournament(id: string): Promise<void> {
  await deleteDoc(doc(db, TOURNAMENTS_COLLECTIONS.tournaments, id))
}

// ─── Registrations ────────────────────────────────────────────────────────────

export async function getRegistrations(
  tournamentId: string,
): Promise<TournamentRegistrationDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.registrations),
    where("tournamentId", "==", tournamentId),
    orderBy("createdAt", "asc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentRegistrationDoc))
}

export async function getRegistrationsByClub(
  clubId: string,
): Promise<TournamentRegistrationDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.registrations),
    where("clubId", "==", clubId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentRegistrationDoc))
}

export async function getMyRegistrations(
  userId: string,
): Promise<TournamentRegistrationDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.registrations),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentRegistrationDoc))
}

export async function getMyRegistrationForTournament(
  tournamentId: string,
  userId: string,
): Promise<TournamentRegistrationDoc | null> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.registrations),
    where("tournamentId", "==", tournamentId),
    where("userId", "==", userId),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as TournamentRegistrationDoc
}

export async function registerForTournament(
  data: Omit<TournamentRegistrationDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  // Capacity check
  const tournament = await getTournamentById(data.tournamentId)
  if (!tournament) throw new Error("Torneo no encontrado.")
  if (tournament.status !== "published")
    throw new Error("El torneo no está abierto para inscripción.")

  const existingRegs = await getRegistrations(data.tournamentId)
  const activeCount = existingRegs.filter(
    (r) =>
      r.registrationStatus === "approved" ||
      r.registrationStatus === "paid" ||
      r.registrationStatus === "pending",
  ).length

  if (tournament.maxParticipants && activeCount >= tournament.maxParticipants) {
    if (tournament.waitlistEnabled) {
      const ref = await addDoc(col(TOURNAMENTS_COLLECTIONS.registrations), {
        ...data,
        registrationStatus: "waitlist",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return ref.id
    }
    throw new Error("El torneo ya no tiene lugares disponibles.")
  }

  // Check for duplicate
  const existing = await getMyRegistrationForTournament(data.tournamentId, data.userId)
  if (existing) throw new Error("Ya estás inscripto en este torneo.")

  const initialStatus: TournamentRegistrationStatus = tournament.approvalRequired
    ? "pending"
    : "approved"

  const ref = await addDoc(col(TOURNAMENTS_COLLECTIONS.registrations), {
    ...data,
    registrationStatus: initialStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateRegistrationStatus(
  id: string,
  registrationStatus: TournamentRegistrationStatus,
): Promise<void> {
  await updateDoc(doc(db, TOURNAMENTS_COLLECTIONS.registrations, id), {
    registrationStatus,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRegistration(id: string): Promise<void> {
  await deleteDoc(doc(db, TOURNAMENTS_COLLECTIONS.registrations, id))
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function getMatches(tournamentId: string): Promise<TournamentMatchDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.matches),
    where("tournamentId", "==", tournamentId),
    orderBy("round", "asc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentMatchDoc))
}

export async function getMatchesByClub(clubId: string): Promise<TournamentMatchDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.matches),
    where("clubId", "==", clubId),
    where("scheduledAt", "!=", null),
    orderBy("scheduledAt", "asc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentMatchDoc))
}

export async function createMatch(
  data: Omit<TournamentMatchDoc, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(TOURNAMENTS_COLLECTIONS.matches), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateMatch(
  id: string,
  data: Partial<TournamentMatchDoc>,
): Promise<void> {
  await updateDoc(doc(db, TOURNAMENTS_COLLECTIONS.matches, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMatch(id: string): Promise<void> {
  await deleteDoc(doc(db, TOURNAMENTS_COLLECTIONS.matches, id))
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function getStandings(tournamentId: string): Promise<TournamentStandingDoc[]> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.standings),
    where("tournamentId", "==", tournamentId),
    orderBy("points", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentStandingDoc))
}

export async function upsertStanding(
  tournamentId: string,
  clubId: string,
  registrationId: string,
  participantName: string,
  delta: {
    played: number
    won: number
    lost: number
    drawn: number
    points: number
    scoreFor: number
    scoreAgainst: number
  },
): Promise<void> {
  const q = query(
    col(TOURNAMENTS_COLLECTIONS.standings),
    where("tournamentId", "==", tournamentId),
    where("registrationId", "==", registrationId),
  )
  const snap = await getDocs(q)
  if (snap.empty) {
    await addDoc(col(TOURNAMENTS_COLLECTIONS.standings), {
      tournamentId,
      clubId,
      registrationId,
      participantId: registrationId,
      participantName,
      played: delta.played,
      won: delta.won,
      lost: delta.lost,
      drawn: delta.drawn,
      points: delta.points,
      scoreFor: delta.scoreFor,
      scoreAgainst: delta.scoreAgainst,
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(snap.docs[0].ref, {
      played: increment(delta.played),
      won: increment(delta.won),
      lost: increment(delta.lost),
      drawn: increment(delta.drawn),
      points: increment(delta.points),
      scoreFor: increment(delta.scoreFor),
      scoreAgainst: increment(delta.scoreAgainst),
      updatedAt: serverTimestamp(),
    })
  }
}

// ─── Bracket generation ────────────────────────────────────────────────────────

/**
 * Generate single-elimination brackets from approved registrations.
 * Pads to next power of 2 with BYEs. Returns created match IDs.
 */
export async function generateSingleElimination(
  tournament: TournamentDoc,
  registrations: TournamentRegistrationDoc[],
): Promise<string[]> {
  if (!tournament.id) throw new Error("tournamentId required")

  const approved = registrations.filter(
    (r) => r.registrationStatus === "approved" || r.registrationStatus === "paid",
  )
  if (approved.length < 2) throw new Error("Se necesitan al menos 2 participantes aprobados.")

  // Pad to next power of 2
  const n = nextPow2(approved.length)
  const participants: Array<TournamentParticipant | null> = approved.map((r) => ({
    registrationId: r.id!,
    userId: r.userId,
    displayName: r.userName ?? r.userEmail ?? r.userId,
  }))
  while (participants.length < n) participants.push(null) // null = BYE

  // Shuffle
  shuffle(participants)

  const ids: string[] = []
  const batch = writeBatch(db)

  for (let i = 0; i < n; i += 2) {
    const pA = participants[i]
    const pB = participants[i + 1]
    const ref = doc(col(TOURNAMENTS_COLLECTIONS.matches))
    batch.set(ref, {
      tournamentId: tournament.id,
      clubId: tournament.clubId,
      round: 1,
      roundLabel: roundLabel(1, n),
      participantA: pA ?? null,
      participantB: pB ?? null,   // null = BYE → pA wins automatically
      status: pB === null ? "completed" : "scheduled",
      scoreA: pB === null ? "BYE" : "",
      scoreB: pB === null ? "" : "",
      winnerId: pB === null ? (pA?.registrationId ?? null) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    ids.push(ref.id)
  }

  await batch.commit()
  return ids
}

/**
 * Generate round-robin matches: each participant plays all others once.
 */
export async function generateRoundRobin(
  tournament: TournamentDoc,
  registrations: TournamentRegistrationDoc[],
): Promise<string[]> {
  if (!tournament.id) throw new Error("tournamentId required")
  const approved = registrations.filter(
    (r) => r.registrationStatus === "approved" || r.registrationStatus === "paid",
  )
  if (approved.length < 2) throw new Error("Se necesitan al menos 2 participantes.")

  const participants: TournamentParticipant[] = approved.map((r) => ({
    registrationId: r.id!,
    userId: r.userId,
    displayName: r.userName ?? r.userEmail ?? r.userId,
  }))

  const ids: string[] = []
  const batch = writeBatch(db)
  let round = 1

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const ref = doc(col(TOURNAMENTS_COLLECTIONS.matches))
      batch.set(ref, {
        tournamentId: tournament.id,
        clubId: tournament.clubId,
        round,
        roundLabel: `Fecha ${round}`,
        participantA: participants[i],
        participantB: participants[j],
        status: "scheduled",
        scoreA: "",
        scoreB: "",
        winnerId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      ids.push(ref.id)
      round++
    }
  }

  await batch.commit()
  return ids
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function roundLabel(round: number, totalSlots: number): string {
  const final = Math.log2(totalSlots)
  const diff = final - round
  if (diff === 0) return "Final"
  if (diff === 1) return "Semifinal"
  if (diff === 2) return "Cuartos de Final"
  if (diff === 3) return "Octavos de Final"
  return `Ronda ${round}`
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function countRegistrationsByStatus(
  registrations: TournamentRegistrationDoc[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of registrations) {
    counts[r.registrationStatus] = (counts[r.registrationStatus] ?? 0) + 1
  }
  return counts
}

export function spotsRemaining(
  tournament: TournamentDoc,
  registrations: TournamentRegistrationDoc[],
): number | null {
  if (!tournament.maxParticipants) return null
  const active = registrations.filter(
    (r) =>
      r.registrationStatus === "approved" ||
      r.registrationStatus === "paid" ||
      r.registrationStatus === "pending",
  ).length
  return Math.max(0, tournament.maxParticipants - active)
}

export function isRegistrationOpen(tournament: TournamentDoc): boolean {
  if (tournament.status !== "published") return false
  const now = Date.now()
  if (tournament.registrationDeadline) {
    const deadline =
      typeof tournament.registrationDeadline.toDate === "function"
        ? tournament.registrationDeadline.toDate().getTime()
        : new Date(tournament.registrationDeadline).getTime()
    if (now > deadline) return false
  }
  return true
}
