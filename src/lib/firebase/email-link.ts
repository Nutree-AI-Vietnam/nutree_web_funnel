import type { FirebaseOptions } from 'firebase/app';

type PublicEnvironment = Record<string, string | undefined>;

function publicEnvironment(): PublicEnvironment {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL: process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL,
  };
}

function required(source: PublicEnvironment, key: keyof PublicEnvironment): string {
  const value = source[key]?.trim();
  if (!value) throw new Error(`${key} is required before sending Firebase email links.`);
  return value;
}

/** Reads only public Firebase browser configuration; it never contains a service credential. */
export function readFirebaseEmailLinkConfig(source: PublicEnvironment = publicEnvironment()): {
  firebase: FirebaseOptions;
  continueUrl: string;
} {
  const continueUrl = required(source, 'NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL');
  const parsed = new URL(continueUrl);
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/open-nutree' || parsed.search || parsed.hash) {
    throw new Error('NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL must be an HTTPS /open-nutree URL with no query or fragment.');
  }

  return {
    firebase: {
      apiKey: required(source, 'NEXT_PUBLIC_FIREBASE_API_KEY'),
      authDomain: required(source, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: required(source, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      appId: required(source, 'NEXT_PUBLIC_FIREBASE_APP_ID'),
    },
    continueUrl: parsed.toString(),
  };
}

/**
 * Sends Firebase's own sign-in email after RevenueCat's Web SDK resolves a
 * successful purchase. The email remains in caller memory and is never stored here.
 */
export async function sendFirebaseEmailLinkAfterPurchase(email: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Firebase email links can only be sent in a browser.');

  const { firebase, continueUrl } = readFirebaseEmailLinkConfig();
  const [{ getApps, initializeApp }, { getAuth, sendSignInLinkToEmail }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps()[0] ?? initializeApp(firebase);
  await sendSignInLinkToEmail(getAuth(app), email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
}
