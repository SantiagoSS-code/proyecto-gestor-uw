import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

const env = {};
for (const line of envLines) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID || 'proyecto-gestor-uw-dev',
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function checkCenter() {
  console.log('=== Searching by slug: area-45-cardales ===');
  const bySlug = await db.collection('centers').where('slug', '==', 'area-45-cardales').get();
  console.log('Found:', bySlug.size, 'documents');
  
  bySlug.forEach(doc => {
    const data = doc.data();
    console.log('\nDocument ID:', doc.id);
    console.log('Name:', data.name);
    console.log('Slug:', data.slug);
    console.log('Published:', data.published);
    console.log('Type of published:', typeof data.published);
    console.log('\nAll fields:');
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'privateKey' && typeof value !== 'object') {
        console.log(`  ${key}: ${value}`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: [object]`);
      }
    }
  });

  console.log('\n=== All published centers ===');
  const published = await db.collection('centers').where('published', '==', true).get();
  console.log('Total published:', published.size);
  
  published.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.name} | slug: ${data.slug} | published: ${data.published}`);
  });
}

checkCenter()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
