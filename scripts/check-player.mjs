import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const auth = getAuth(app);

const email = 'santiago.nsanchez1@gmail.com';
const password = process.argv[2] || 'password123';

console.log('Checking Firestore for:', email);

try {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  
  console.log('\n=== USER INFO ===');
  console.log('UID:', uid);
  console.log('Email:', cred.user.email);
  
  console.log('\n=== CHECKING players/' + uid + ' ===');
  const playerDoc = await getDoc(doc(db, 'players', uid));
  console.log('exists:', playerDoc.exists());
  if (playerDoc.exists()) {
    console.log('data:', JSON.stringify(playerDoc.data(), null, 2));
  }
  
  console.log('\n=== CHECKING users/' + uid + ' ===');
  const userDoc = await getDoc(doc(db, 'users', uid));
  console.log('exists:', userDoc.exists());
  if (userDoc.exists()) {
    console.log('data:', JSON.stringify(userDoc.data(), null, 2));
  }
  
} catch (err) {
  console.error('Error:', err.code, err.message);
}

process.exit(0);
