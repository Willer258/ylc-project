import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    // Parse JSON service account from env var
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
    }
  }

  // Fallback: use project ID only (works locally with gcloud auth)
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const app = getAdminApp();
export const adminDb = getFirestore(app);
