import { describe, it, expect } from 'vitest';

import { keepOrMintKey } from './idempotency-key';

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
