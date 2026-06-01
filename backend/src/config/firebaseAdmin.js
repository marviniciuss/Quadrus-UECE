import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to look for service account JSON
const LOCAL_CREDENTIAL_PATH = path.resolve(__dirname, '../../firebase-service-account.json');

let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized) return admin;

  try {
    // 1. Try loading credentials from raw JSON environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log('Initializing Firebase Admin via process.env.FIREBASE_SERVICE_ACCOUNT_JSON...');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      return admin;
    }

    // 2. Try loading from local credentials file
    if (fs.existsSync(LOCAL_CREDENTIAL_PATH)) {
      console.log(`Initializing Firebase Admin via local credentials file: ${LOCAL_CREDENTIAL_PATH}...`);
      const serviceAccount = JSON.parse(fs.readFileSync(LOCAL_CREDENTIAL_PATH, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      return admin;
    }

    // 3. Fallback to application default credentials (useful in GAC/App Hosting)
    console.warn('No explicit Firebase service account key provided. Falling back to applicationDefault().');
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    initialized = true;
    return admin;

  } catch (error) {
    console.error('CRITICAL: Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
}

// Bootstrap initialization on import
const firebaseAdminInstance = initializeFirebaseAdmin();

export default firebaseAdminInstance;
export { admin };
