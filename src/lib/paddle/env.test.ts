import { describe, expect, it } from 'vitest';
import { readPaddleClientConfig } from './env';

describe('readPaddleClientConfig', () => {
  it('requires an explicit Paddle environment', () => {
    expect(() => readPaddleClientConfig({ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: 'live_token' })).toThrow(
      'NEXT_PUBLIC_PADDLE_ENVIRONMENT is required',
    );
  });

  it('requires a client token', () => {
    expect(() => readPaddleClientConfig({ NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'live' })).toThrow(
      'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is required',
    );
  });

  it('rejects a non-live token for live mode', () => {
    expect(() => readPaddleClientConfig({
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'live',
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: 'test_token',
    })).toThrow('must start with "live_"');
  });

  it('requires a sandbox token for sandbox mode', () => {
    expect(() => readPaddleClientConfig({
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'sandbox',
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: 'live_token',
    })).toThrow('must start with "test_"');
  });

  it('accepts a sandbox token for sandbox mode', () => {
    expect(readPaddleClientConfig({
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'sandbox',
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: 'test_token',
    })).toEqual({
      environment: 'sandbox',
      token: 'test_token',
    });
  });

  it('returns the validated config', () => {
    expect(readPaddleClientConfig({
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: 'live',
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: 'live_token',
    })).toEqual({
      environment: 'live',
      token: 'live_token',
    });
  });
});
