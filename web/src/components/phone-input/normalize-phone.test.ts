import { describe, it, expect } from 'vitest';

import { normalizePhoneValue } from './utils';

describe('normalizePhoneValue', () => {
  it('leaves an international number alone', () => {
    expect(normalizePhoneValue('+528134560078')).toBe('+528134560078');
    expect(normalizePhoneValue('+14155552671')).toBe('+14155552671');
  });

  /**
   * What a browser autofills is the digits it stored. Without the plus sign the
   * number does not parse, so the flag stays on the default country and the form
   * calls a perfectly good number invalid.
   */
  it('reads an autofilled number without its plus as international', () => {
    expect(normalizePhoneValue('528134560078')).toBe('+528134560078');
    expect(normalizePhoneValue('14155552671')).toBe('+14155552671');
  });

  it('ignores the punctuation an autofill may carry', () => {
    expect(normalizePhoneValue('+52 (813) 456-0078')).toBe('+528134560078');
  });

  /**
   * The correction must not hijack a national number: `4155552671` under a US
   * flag is a San Francisco number, and reading it as international would turn it
   * into a Swiss one.
   */
  it('leaves a valid national number in the selected country alone', () => {
    expect(normalizePhoneValue('4155552671', 'US')).toBe('+14155552671');
    expect(normalizePhoneValue('8134560078', 'MX')).toBe('+528134560078');
  });

  /** A number still being typed must not be rewritten under the person typing it. */
  it('leaves what cannot be read as international untouched', () => {
    expect(normalizePhoneValue('813')).toBe('813');
    expect(normalizePhoneValue('')).toBe('');
    expect(normalizePhoneValue(undefined)).toBeUndefined();
  });
});
