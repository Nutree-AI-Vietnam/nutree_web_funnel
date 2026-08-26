import { describe, expect, it } from 'vitest';
import { clearCheckoutEmail, readCheckoutEmail, saveCheckoutEmail } from './checkout-email';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe('checkout email session helper', () => {
  it('stores a normalized email for purchase prefill and clears it', () => {
    const session = memoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { sessionStorage: session },
    });

    saveCheckoutEmail(' Buyer@Example.COM ');
    expect(readCheckoutEmail()).toBe('buyer@example.com');
    clearCheckoutEmail();
    expect(readCheckoutEmail()).toBeNull();
  });

  it('rejects invalid emails', () => {
    const session = memoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { sessionStorage: session },
    });

    saveCheckoutEmail('not-an-email');
    expect(readCheckoutEmail()).toBeNull();
  });
});
