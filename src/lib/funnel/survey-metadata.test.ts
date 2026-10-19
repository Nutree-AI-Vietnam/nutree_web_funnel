import { describe, expect, it } from 'vitest';
import { en } from '@/lib/copy';
import { rootMetadata } from './survey-metadata';

describe('rootMetadata', () => {
  it('uses English defaults for the English funnel', () => {
    const metadata = rootMetadata('en');
    expect(metadata.description).toBe(en.landing.metaDescription);
    expect(metadata.openGraph).toMatchObject({
      description: en.landing.metaDescription,
      locale: 'en_US',
      url: '/survey/en',
    });
    expect(metadata.twitter).toMatchObject({ description: en.landing.metaDescription });
    expect(JSON.stringify(metadata)).not.toContain('Trả lời');
  });

  it('keeps the Vietnamese defaults for every other route', () => {
    const metadata = rootMetadata('vi');
    expect(metadata.description).toBe('Trả lời vài câu để Nutree tính calo và macro cho bạn.');
    expect(metadata.openGraph).toMatchObject({ locale: 'vi_VN', url: '/' });
  });
});
