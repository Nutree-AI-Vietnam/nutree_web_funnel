import { describe, expect, it } from 'vitest';
import { readFirebaseClientConfig } from './client';

describe('readFirebaseClientConfig', () => {
  it('fails clearly when any required public Firebase setting is absent', () => {
    expect(() => readFirebaseClientConfig({ NEXT_PUBLIC_FIREBASE_API_KEY: 'key' })).toThrow(
      'Firebase Google sign-in is not configured',
    );
  });

  it('returns a complete Firebase Web configuration', () => {
    expect(
      readFirebaseClientConfig({
        NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'project.firebaseapp.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'project',
        NEXT_PUBLIC_FIREBASE_APP_ID: 'app-id',
      }),
    ).toEqual({
      apiKey: 'key',
      authDomain: 'project.firebaseapp.com',
      projectId: 'project',
      appId: 'app-id',
    });
  });
});
