'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

type EnvironmentSource = Record<string, string | undefined>;

function readPublicEnvironment(): EnvironmentSource {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export interface FirebaseIdentity {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  idToken: string;
}

export function readFirebaseClientConfig(source: EnvironmentSource = readPublicEnvironment()) {
  const apiKey = source.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = source.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = source.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = source.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error('Firebase Google sign-in is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID.');
  }

  return { apiKey, authDomain, projectId, appId };
}

function getFirebaseAuth() {
  const config = readFirebaseClientConfig();
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function signInWithGoogle(): Promise<FirebaseIdentity> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  const { user } = credential;

  if (!user.email) throw new Error('Your Google account did not provide an email address. Choose another account to continue.');

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    idToken: await user.getIdToken(),
  };
}
