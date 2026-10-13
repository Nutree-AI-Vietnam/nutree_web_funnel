import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashMetaIdentity, identifyMetaUser, META_IDENTITY_STORAGE_KEY, normalizeMetaFirstName, readMetaIdentity } from './meta-identity';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('meta identity', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '863565810110494');
    vi.stubGlobal('window', {
      fbq: vi.fn(),
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  it('stores lowercase email and lead id, then re-inits the pixel', () => {
    const identity = identifyMetaUser({
      email: '  Pixel.QA@NutreeAI.com ',
      externalId: 'lead_abc-123',
      firstName: 'Anh Nguyen',
    });
    expect(identity).toEqual({ em: 'pixel.qa@nutreeai.com', external_id: 'lead_abc-123', fn: 'anh' });
    expect(readMetaIdentity()).toEqual(identity);
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledWith('init', '863565810110494', identity);
    expect(JSON.parse(window.sessionStorage.getItem(META_IDENTITY_STORAGE_KEY) ?? '{}')).toEqual(identity);
  });

  it('drops invalid emails and health-looking names that are too short', () => {
    expect(identifyMetaUser({ email: 'not-an-email' })).toBeNull();
    expect(normalizeMetaFirstName('A')).toBeNull();
    expect(normalizeMetaFirstName('Pixel QA')).toBe('pixel');
  });

  it('hashes the stored identity for the Conversions API', async () => {
    await expect(hashMetaIdentity({ em: 'pixel.qa@nutreeai.com', external_id: 'lead_abc-123', fn: 'anh' })).resolves.toEqual({
      em: sha256('pixel.qa@nutreeai.com'),
      external_id: sha256('lead_abc-123'),
      fn: sha256('anh'),
    });
    await expect(hashMetaIdentity({ em: 'pixel.qa@nutreeai.com' })).resolves.toEqual({ em: sha256('pixel.qa@nutreeai.com') });
    await expect(hashMetaIdentity(null)).resolves.toBeNull();
  });
});
