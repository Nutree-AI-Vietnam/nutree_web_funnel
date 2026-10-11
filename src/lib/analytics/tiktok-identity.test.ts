import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTiktokIdentity, identifyTiktokUser, readTiktokIdentity, TIKTOK_IDENTITY_STORAGE_KEY } from './tiktok-identity';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('TikTok identity', () => {
  let store: Map<string, string>;
  let identify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = new Map();
    identify = vi.fn();
    vi.stubGlobal('window', {
      ttq: { track: vi.fn(), identify },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and sends only SHA-256 hashes of the normalized email and lead id', async () => {
    const expected = { email: sha256('jane.doe@example.com'), external_id: sha256('lead-123') };

    await expect(identifyTiktokUser({ email: '  Jane.Doe@Example.COM ', externalId: 'lead-123' })).resolves.toEqual(expected);

    expect(identify).toHaveBeenCalledWith(expected);
    expect(JSON.parse(store.get(TIKTOK_IDENTITY_STORAGE_KEY) ?? 'null')).toEqual(expected);
    expect(store.get(TIKTOK_IDENTITY_STORAGE_KEY)).not.toMatch(/jane|example|lead-123/i);
    expect(readTiktokIdentity()).toEqual(expected);
  });

  it('identifies each pixel instance once per identity', () => {
    const ttq = { track: vi.fn(), identify: vi.fn() };
    const first = { email: 'a'.repeat(64) };
    applyTiktokIdentity(ttq, first);
    applyTiktokIdentity(ttq, { ...first });
    applyTiktokIdentity(ttq, { email: 'b'.repeat(64) });
    expect(ttq.identify.mock.calls).toEqual([[first], [{ email: 'b'.repeat(64) }]]);
  });

  it('ignores invalid emails', async () => {
    await expect(identifyTiktokUser({ email: 'not-an-email' })).resolves.toBeNull();
    expect(identify).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
  });

  it('skips matching when Web Crypto is unavailable', async () => {
    vi.stubGlobal('crypto', {});
    await expect(identifyTiktokUser({ email: 'jane@example.com' })).resolves.toBeNull();
    expect(identify).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
  });

  it('ignores stored values that are not hashes', () => {
    store.set(TIKTOK_IDENTITY_STORAGE_KEY, JSON.stringify({ email: 'jane@example.com', external_id: 'lead-123' }));
    expect(readTiktokIdentity()).toBeNull();
    store.set(TIKTOK_IDENTITY_STORAGE_KEY, JSON.stringify({ email: 'a'.repeat(64), external_id: 'lead-123' }));
    expect(readTiktokIdentity()).toEqual({ email: 'a'.repeat(64) });
  });
});
