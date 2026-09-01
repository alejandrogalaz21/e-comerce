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
});
