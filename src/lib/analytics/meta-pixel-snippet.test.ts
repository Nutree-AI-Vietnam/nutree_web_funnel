import { describe, it, expect } from 'vitest';
import { META_IDENTITY_STORAGE_KEY } from './meta-identity';
import { metaPixelBootstrapScript } from './meta-pixel-snippet';

describe('meta pixel bootstrap', () => {
  it('inits with autoConfig off and stored advanced matching', () => {
    const script = metaPixelBootstrapScript('863565810110494');
    expect(script).toContain("fbq('set','autoConfig',false,'863565810110494')");
    expect(script).toContain(`sessionStorage.getItem('${META_IDENTITY_STORAGE_KEY}')`);
    expect(script).toContain("fbq('init','863565810110494',u)");
    expect(script).toContain("fbq('track','PageView')");
  });

  it('rejects a non-numeric pixel id so the snippet cannot be injected', () => {
    expect(metaPixelBootstrapScript("863');alert(1)//")).toBe('');
  });
});
