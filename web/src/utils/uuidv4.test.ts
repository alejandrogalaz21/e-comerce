import { describe, expect, it } from 'vitest';

import { uuidv4 } from './uuidv4';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv4', () => {
  it('produces a well-formed version 4 uuid', () => {
    expect(uuidv4()).toMatch(UUID_V4);
  });

  it('does not repeat itself', () => {
    const minted = new Set(Array.from({ length: 500 }, () => uuidv4()));

    expect(minted.size).toBe(500);
  });

  it('falls back to a well-formed uuid when the Web Crypto API is missing', () => {
    const original = globalThis.crypto;

    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });

    try {
      expect(uuidv4()).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });

  it('uses the Web Crypto API when it is available', () => {
    const original = globalThis.crypto;
    const randomUUID = () => '3f7b1c92-5d2e-4c8a-b1f0-6a9e2d4c8b31' as const;

    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID },
      configurable: true,
    });

    try {
      expect(uuidv4()).toBe('3f7b1c92-5d2e-4c8a-b1f0-6a9e2d4c8b31');
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});
