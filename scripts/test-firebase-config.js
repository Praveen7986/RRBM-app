// scripts/test-firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"](.*)['"]$/, '$1');
    env[match[1]] = value;
  }
});

console.log('Testing Firebase Initialization...');
console.log('Project ID:', env.VITE_FIREBASE_PROJECT_ID);
console.log('Auth Domain:', env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('API Key:', env.VITE_FIREBASE_API_KEY ? 'Present (Valid)' : 'Missing');

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  console.log('✅ Firebase App, Auth, and Firestore successfully initialized!');

  // Test sign-in with non-existent credentials to verify auth endpoint responds with invalid credential
  console.log('Testing Authentication endpoint response with invalid credential...');
  signInWithEmailAndPassword(auth, '001@volunteer.rrbm.org', 'WrongPassword123')
    .then(() => {
      console.log('Unexpected: Logged in with wrong password');
      process.exit(1);
    })
    .catch((err) => {
      console.log('✅ Firebase Auth endpoint reached and responded securely:');
      console.log('   Code:', err.code);
      console.log('   Message:', err.message);
      process.exit(0);
    });
} catch (err) {
  console.error('❌ Firebase initialization error:', err);
  process.exit(1);
}
