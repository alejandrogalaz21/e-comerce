import { describe, it, expect } from 'vitest';

import { normalizePhoneValue } from './utils';

describe('normalizePhoneValue', () => {
  it('leaves an international number alone', () => {
    expect(normalizePhoneValue('+528134560078')).toBe('+528134560078');
    expect(normalizePhoneValue('+14155552671')).toBe('+14155552671');
  });

  it('reads an autofilled number without its plus as international', () => {
    expect(normalizePhoneValue('528134560078')).toBe('+528134560078');
    expect(normalizePhoneValue('14155552671')).toBe('+14155552671');
  });

  it('ignores the punctuation an autofill may carry', () => {
    expect(normalizePhoneValue('+52 (813) 456-0078')).toBe('+528134560078');
  });

  it('leaves a valid national number in the selected country alone', () => {
    expect(normalizePhoneValue('4155552671', 'US')).toBe('+14155552671');
    expect(normalizePhoneValue('8134560078', 'MX')).toBe('+528134560078');
  });

  it('leaves what cannot be read as international untouched', () => {
    expect(normalizePhoneValue('813')).toBe('813');
    expect(normalizePhoneValue('')).toBe('');
    expect(normalizePhoneValue(undefined)).toBeUndefined();
  });

  /**
   * Typing arrives one digit at a time, and a half-written number parses as a
   * country long before it is a number: '+6661' reads as Thailand. Promoting it
   * moved the flag under the cursor and left the field formatting for a country
   * the person never chose.
   */
  it('does not read a number still being typed as international', () => {
    const typing = ['6', '66', '666', '6661', '66612', '666123'];

    typing.forEach((partial) => {
      expect(normalizePhoneValue(partial, 'US')).toBe(partial);
      expect(normalizePhoneValue(partial, 'MX')).toBe(partial);
    });
  });

  it('promotes the digits only once they are a whole number', () => {
    expect(normalizePhoneValue('528134560078', 'US')).toBe('+528134560078');
    expect(normalizePhoneValue('52813456007', 'US')).toBe('52813456007');
  });

  it('keeps a national number in the selected country from becoming a foreign one', () => {
    expect(normalizePhoneValue('4155552671', 'US')).toBe('+14155552671');
  });
});
