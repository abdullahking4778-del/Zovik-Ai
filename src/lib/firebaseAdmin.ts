import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;
let initMode: "service-account" | "adc-or-project-id" | "unconfigured" = "unconfigured";
let initError: string | null = null;

function initializeFirebaseAdmin(): void {
  if (adminApp || getApps().length > 0) {
    adminApp = getApps()[0];
    adminAuthInstance = getAuth(adminApp);
    adminDbInstance = getFirestore(adminApp);
    return;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "zovik-ai-f7331";

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      initMode = "service-account";
    } else if (clientEmail && privateKey) {
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, "\n");
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      initMode = "service-account";
    } else {
      // Application Default Credentials (ADC) or basic project ID for Google Cloud
      adminApp = initializeApp({
        projectId,
      });
      initMode = "adc-or-project-id";
    }

    adminAuthInstance = getAuth(adminApp);
    adminDbInstance = getFirestore(adminApp);
  } catch (err: unknown) {
    initError = err instanceof Error ? err.message : String(err);
    console.warn("[FirebaseAdmin] Initialization warning:", initError);
    try {
      if (!adminApp && getApps().length > 0) {
        adminApp = getApps()[0];
        adminAuthInstance = getAuth(adminApp);
        adminDbInstance = getFirestore(adminApp);
      }
    } catch {}
  }
}

initializeFirebaseAdmin();

export const adminAuth = (adminAuthInstance || (getApps().length > 0 ? getAuth(getApps()[0]) : ({} as Auth)));
export const adminDb = (adminDbInstance || (getApps().length > 0 ? getFirestore(getApps()[0]) : ({} as Firestore)));

export function getFirebaseAdminStatus(): {
  configured: boolean;
  hasServiceAccount: boolean;
  mode: "service-account" | "adc-or-project-id" | "unconfigured";
  projectId: string;
  error?: string | null;
} {
  const hasServiceAccount = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );

  return {
    configured: Boolean(adminApp && !initError),
    hasServiceAccount,
    mode: initMode,
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "zovik-ai-f7331",
    error: initError,
  };
}
