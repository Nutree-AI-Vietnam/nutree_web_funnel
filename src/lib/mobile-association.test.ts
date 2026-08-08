import { describe, expect, it } from 'vitest';

import {
  androidAssociationForHost,
  appleAssociationForHost,
  mobileEnvironmentForHost,
  sha256Fingerprints,
} from '@/lib/mobile-association';

describe('mobile association mapping', () => {
  it('maps quiz hosts to isolated environments', () => {
    expect(mobileEnvironmentForHost('quiz.preview.nutreeai.com')).toBe('staging');
    expect(mobileEnvironmentForHost('quiz.nutreeai.com:443')).toBe('production');
    expect(mobileEnvironmentForHost('unknown.nutreeai.com')).toBeNull();
  });

  it('serves only the staging iOS app on the preview host', () => {
    expect(appleAssociationForHost('quiz.preview.nutreeai.com')).toEqual({
      applinks: {
        apps: [],
        details: [
          {
            appID: 'KB4Q9QGD7M.com.nutreeai.mobile.staging',
            paths: ['/auth/email-link*', '/open-nutree*', '/redeem*', '/postcheckout*'],
          },
        ],
      },
    });
  });

  it('renders configured production Android signing fingerprints', () => {
    expect(androidAssociationForHost('quiz.nutreeai.com', 'AA:BB,\nCC:DD')).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.nutreeai.mobile',
          sha256_cert_fingerprints: ['AA:BB', 'CC:DD'],
        },
      },
    ]);
  });

  it('fails closed until signing fingerprints are configured', () => {
    expect(androidAssociationForHost('quiz.preview.nutreeai.com', '')).toEqual([]);
    expect(sha256Fingerprints(' AA:BB \n CC:DD ')).toEqual(['AA:BB', 'CC:DD']);
  });
});
