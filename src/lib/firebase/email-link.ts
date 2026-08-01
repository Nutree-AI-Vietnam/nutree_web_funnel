import type { FirebaseOptions } from 'firebase/app';

export type SafePaymentEmailLinkState =
  | { kind: 'payment_pending' }
  | { kind: 'payment_verified' }
  | { kind: 'email_link_sent' }
  | { kind: 'source_unavailable'; reason: 'paddle_server_projection_not_available' };

type PublicEnvironment = Record<string, string | undefined>;

export const disabledPaddleEmailLinkState: SafePaymentEmailLinkState = {
  kind: 'source_unavailable',
  reason: 'paddle_server_projection_not_available',
};

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

export function maySendFirebaseEmailLink(state: SafePaymentEmailLinkState): boolean {
  return state.kind === 'payment_verified';
}

/**
 * Sends a Firebase Email Link only after an authoritative server projection says
 * payment is verified. The email remains in caller memory and is never stored here.
 */
export async function sendVerifiedPaymentEmailLink(
  email: string,
  paymentState: SafePaymentEmailLinkState,
): Promise<void> {
  if (!maySendFirebaseEmailLink(paymentState)) {
    throw new Error('Firebase email links require a server-verified payment status.');
  }
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
