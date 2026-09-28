import { describe, it, expect, vi, beforeEach } from 'vitest';
import { identifyMetaUser, META_IDENTITY_STORAGE_KEY, normalizeMetaFirstName, readMetaIdentity } from './meta-identity';

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
});
