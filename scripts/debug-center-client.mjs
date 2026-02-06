import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read config from .env.local
const env = readFileSync('.env.local', 'utf8');
const get = (key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1];

const firebaseConfig = {
  apiKey: get('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: get('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('=== Searching for slug: area-45-cardales ===\n');

// Query by slug
const q = query(collection(db, 'centers'), where('slug', '==', 'area-45-cardales'));
const snap = await getDocs(q);

console.log('Found', snap.size, 'documents with this slug');

snap.forEach(doc => {
  const data = doc.data();
  console.log('\n--- Document ID:', doc.id, '---');
  console.log('name:', data.name);
  console.log('slug:', data.slug);
  console.log('published:', data.published, '(type:', typeof data.published, ')');
  console.log('status:', data.status);
});

console.log('\n=== Searching for published=true ===\n');

const q2 = query(collection(db, 'centers'), where('published', '==', true));
const snap2 = await getDocs(q2);

console.log('Found', snap2.size, 'published centers');

snap2.forEach(doc => {
  const data = doc.data();
  console.log(`  - ${data.name} | slug: ${data.slug}`);
});

process.exit(0);
