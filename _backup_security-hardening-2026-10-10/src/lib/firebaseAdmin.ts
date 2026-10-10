import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: "zovik-ai-f7331"
  });
}

export const adminAuth = getAuth();
