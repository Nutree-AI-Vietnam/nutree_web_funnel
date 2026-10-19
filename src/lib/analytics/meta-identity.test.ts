import { createHash } from 'node:crypto';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { hashMetaIdentity, identifyMetaUser, META_IDENTITY_STORAGE_KEY, normalizeMetaFirstName, readMetaIdentity } from './meta-identity';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('meta identity', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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

  it('re-inits only the english pixel on the english funnel', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubGlobal('document', {
      documentElement: { getAttribute: (name: string) => (name === 'data-funnel-locale' ? 'en' : null) },
    });
    identifyMetaUser({ email: 'pixel.qa@nutreeai.com', externalId: 'lead_abc-123', firstName: 'Anh' });
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledTimes(1);
    expect(w.fbq).toHaveBeenCalledWith('init', '2222222222', {
      em: 'pixel.qa@nutreeai.com',
      external_id: 'lead_abc-123',
      fn: 'anh',
    });
  });

  it('re-inits the rendered pixel when it differs from the english env id', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubGlobal('document', {
      documentElement: {
        getAttribute: (name: string) => {
          if (name === 'data-funnel-locale') return 'en';
          if (name === 'data-meta-pixel-id') return '863565810110494';
          return null;
        },
      },
    });
    identifyMetaUser({ email: 'pixel.qa@nutreeai.com' });
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledTimes(1);
    expect(w.fbq).toHaveBeenCalledWith('init', '863565810110494', { em: 'pixel.qa@nutreeai.com' });
  });

  it('re-inits the default pixel when the english id is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '');
    vi.stubGlobal('document', {
      documentElement: { getAttribute: () => 'en' },
    });
    identifyMetaUser({ email: 'pixel.qa@nutreeai.com' });
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledTimes(1);
    expect(w.fbq).toHaveBeenCalledWith('init', '863565810110494', { em: 'pixel.qa@nutreeai.com' });
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
