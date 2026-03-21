import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  let val = trimmed.slice(idx + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
    val = val.slice(1, -1)
  process.env[key] = val
}

import admin from 'firebase-admin'

const pk = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n')

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: pk,
  })
})
const db = admin.firestore()

const teamSnap = await db.collectionGroup('team').get()
console.log('=== Team members ===')
teamSnap.forEach(doc => {
  console.log('Path:', doc.ref.path)
  const d = doc.data()
  console.log('  name:', d.name, '| email:', d.email, '| role:', d.role, '| id:', d.id)
})

console.log('\n=== Users with isTeamMember ===')
const usersSnap = await db.collection('users').where('isTeamMember', '==', true).get()
usersSnap.forEach(doc => {
  const d = doc.data()
  console.log('Path:', doc.ref.path)
  console.log('  centerId:', d.centerId, '| role:', d.role, '| uid:', d.uid)
})

process.exit(0)
