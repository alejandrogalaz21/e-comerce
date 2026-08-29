import { describe, it, expect } from 'vitest';

import { keepOrMintKey, shouldMintKey } from './idempotency-key';

// ----------------------------------------------------------------------

describe('keepOrMintKey', () => {
  it('mints a key when the checkout has none yet', () => {
    expect(keepOrMintKey('')).toMatch(/[0-9a-f-]{36}/);
  });

  it('keeps the existing key, so every press of confirm carries the same one', () => {
    const minted = keepOrMintKey('');

    expect(keepOrMintKey(minted)).toBe(minted);
    expect(keepOrMintKey(minted)).toBe(minted);
  });

  it('treats a missing value the same as an empty one', () => {
    expect(keepOrMintKey(undefined)).toMatch(/[0-9a-f-]{36}/);
    expect(keepOrMintKey(null)).toMatch(/[0-9a-f-]{36}/);
  });

  it('mints a distinct key per attempt, so a retry is a new attempt', () => {
    expect(keepOrMintKey('')).not.toBe(keepOrMintKey(''));
  });
});

describe('shouldMintKey', () => {
  it('does not mint while the cart is empty, which is also the unhydrated state', () => {
    expect(shouldMintKey(0, '')).toBe(false);
  });

  it('mints once the cart has contents and no key exists yet', () => {
    expect(shouldMintKey(1, '')).toBe(true);
  });

  it('never mints again once a key exists', () => {
    expect(shouldMintKey(3, 'existing-key')).toBe(false);
  });

  it('treats a missing key like an empty one', () => {
    expect(shouldMintKey(1, undefined)).toBe(true);
    expect(shouldMintKey(0, null)).toBe(false);
  });
});
