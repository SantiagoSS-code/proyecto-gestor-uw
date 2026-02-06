import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const email = process.argv[2] || 'santiagonicsanchez@gmail.com';

async function deleteUser() {
  try {
    const user = await auth.getUserByEmail(email);
    console.log('Found user:', user.uid);
    await auth.deleteUser(user.uid);
    console.log(`User ${email} deleted successfully!`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

deleteUser();
