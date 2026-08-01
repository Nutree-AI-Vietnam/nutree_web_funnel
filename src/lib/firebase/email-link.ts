import type { FirebaseOptions } from 'firebase/app';

type PublicEnvironment = Record<string, string | undefined>;

const emailStorageKey = 'nutree.firebase.email-for-email-link';

function publicEnvironment(): PublicEnvironment {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL: process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL,
    NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID: process.env.NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID,
    NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME: process.env.NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME,
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
  iosBundleId?: string;
  androidPackageName?: string;
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
    iosBundleId: source.NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID?.trim() || undefined,
    androidPackageName: source.NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME?.trim() || undefined,
  };
}

/**
 * Sends Firebase's own sign-in email after RevenueCat's Web SDK resolves a
 * successful purchase. The email remains in caller memory and is never stored here.
 */
export async function sendFirebaseEmailLinkAfterPurchase(email: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Firebase email links can only be sent in a browser.');

  const { firebase, continueUrl, iosBundleId, androidPackageName } = readFirebaseEmailLinkConfig();
  const [{ getApps, initializeApp }, { getAuth, sendSignInLinkToEmail }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps()[0] ?? initializeApp(firebase);
  await sendSignInLinkToEmail(getAuth(app), email, {
    url: continueUrl,
    handleCodeInApp: true,
    ...(iosBundleId ? { iOS: { bundleId: iosBundleId } } : {}),
    ...(androidPackageName ? { android: { packageName: androidPackageName, installApp: true } } : {}),
  });
  // Firebase recommends retaining only the email locally for same-device completion.
  // The action URL remains the sole location for Firebase's one-time sign-in code.
  window.localStorage.setItem(emailStorageKey, email);
}

/** Returns the same-device email remembered solely for Firebase email-link completion. */
export function readEmailForEmailLinkCompletion(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(emailStorageKey);
}

/** Clears the locally remembered email after a successful completion or cancellation. */
export function clearEmailForEmailLinkCompletion(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(emailStorageKey);
}

async function firebaseAuth() {
  const { firebase } = readFirebaseEmailLinkConfig();
  const [{ getApps, initializeApp }, authModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps()[0] ?? initializeApp(firebase);
  return { auth: authModule.getAuth(app), authModule };
}

/** Checks whether the current URL is a Firebase email sign-in action without logging it. */
export async function isFirebaseEmailLink(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const { auth, authModule } = await firebaseAuth();
  return authModule.isSignInWithEmailLink(auth, url);
}

/** Completes Firebase's email-link sign-in. The caller owns all user-facing error handling. */
export async function completeFirebaseEmailLinkSignIn(email: string, url: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Firebase email links can only be completed in a browser.');
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error('Enter the email address used to receive this sign-in link.');

  const { auth, authModule } = await firebaseAuth();
  await authModule.signInWithEmailLink(auth, normalizedEmail, url);
  clearEmailForEmailLinkCompletion();
}
