import { vi, describe, expect, it } from 'vitest';

import { applyServerFieldErrors } from './server-errors';

import type { UseFormSetError } from 'react-hook-form';

type ProductFields = {
  sku: string;
  name: string;
  price: number;
  stock: number;
};

const fieldNames = ['sku', 'name', 'price', 'stock'] as const;

function makeSetError() {
  return vi.fn() as unknown as UseFormSetError<ProductFields> & ReturnType<typeof vi.fn>;
}

describe('applyServerFieldErrors', () => {
  it('maps each message of a Nest 400 array to its field', () => {
    const setError = makeSetError();
    const error = {
      message: ['name should not be empty', 'price must not be less than 0'],
    };

    const applied = applyServerFieldErrors(error, setError, fieldNames);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith(
      'name',
      { type: 'server', message: 'name should not be empty' },
      { shouldFocus: true }
    );
    expect(setError).toHaveBeenCalledWith(
      'price',
      { type: 'server', message: 'price must not be less than 0' },
      { shouldFocus: false }
    );
  });

  it('maps a 409 duplicate sku message to the sku field', () => {
    const setError = makeSetError();
    const error = { message: "Product with sku 'X' already exists" };

    const applied = applyServerFieldErrors(error, setError, fieldNames);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith(
      'sku',
      { type: 'server', message: "Product with sku 'X' already exists" },
      { shouldFocus: true }
    );
  });

  it('returns false and calls nothing for an unknown message', () => {
    const setError = makeSetError();

    const applied = applyServerFieldErrors({ message: 'Internal server error' }, setError, fieldNames);

    expect(applied).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns false for a non-object error', () => {
    const setError = makeSetError();

    expect(applyServerFieldErrors('boom', setError, fieldNames)).toBe(false);
    expect(applyServerFieldErrors(null, setError, fieldNames)).toBe(false);
    expect(applyServerFieldErrors(undefined, setError, fieldNames)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('sets shouldFocus true only for the first applied error', () => {
    const setError = makeSetError();
    const error = {
      message: ['unrelated message', 'stock must be an integer', 'sku is too long', 'name is too long'],
    };

    const applied = applyServerFieldErrors(error, setError, fieldNames);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(3);
    const focusFlags = setError.mock.calls.map((call) => call[2]);
    expect(focusFlags).toEqual([{ shouldFocus: true }, { shouldFocus: false }, { shouldFocus: false }]);
  });
});
