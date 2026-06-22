import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;
let firebaseApp = null;

export function initFirebase() {
  if (initialized) return;
  try {
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    const credentialFactory = typeof cert === 'function' ? cert : null;

    if (!credentialFactory) {
      throw new Error('Firebase credential factory is unavailable.');
    }

    firebaseApp = getApps().length ? getApp() : initializeApp({credential: credentialFactory(serviceAccount)});
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    firebaseApp = null;
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
  }
}

export function getFirebaseMessaging() {
  if (!firebaseApp) return null;
  return getMessaging(firebaseApp);
}
