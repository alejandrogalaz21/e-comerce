/**
 * Browsers autofill a phone as the digits they stored — `528134560078` — and a
 * number without its `+` is not an international number: it does not parse, the
 * flag cannot be derived from it, and validation rejects it.
 *
 * The digits are read as international only when they are **not** a valid number
 * for the country already selected. Otherwise a national number like
 * `4155552671` typed under a US flag would be rewritten as a Swiss `+41 5555
 * 2671`, which is a far worse failure than the one being fixed.
 */
import type { Country } from 'react-phone-number-input';

import { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input';

import { countries } from 'src/assets/data/countries';

export function normalizePhoneValue(
  rawValue?: string,
  country?: Country
): string | undefined {
  if (!rawValue) return rawValue;

  // Store one shape for one number: the spacing and brackets an autofill carries
  // are formatting, and a search for "5552671" should not depend on them.
  const asWritten = parsePhoneNumber(rawValue);
  if (asWritten) return asWritten.number;

  if (country) {
    const national = parsePhoneNumber(rawValue, country);
    if (national && isValidPhoneNumber(rawValue, country)) return national.number;
  }

  const digits = rawValue.replace(/\D/g, '');
  const international = digits ? parsePhoneNumber(`+${digits}`) : undefined;

  return international ? international.number : rawValue;
}

export function getCountryCode(inputValue: string, countryCode?: Country) {
  if (inputValue) {
    const phoneNumber = parsePhoneNumber(inputValue);

    if (phoneNumber) {
      return phoneNumber?.country;
    }
  }

  return countryCode ?? 'US';
}


export function getCountry(countryCode?: Country) {
  const option = countries.filter((country) => country.code === countryCode)[0];
  return option;
}

type ApplyFilterProps = {
  query: string;
  inputData: typeof countries;
};

export function applyFilter({ inputData, query }: ApplyFilterProps) {
  if (query) {
    return inputData.filter(
      (country) =>
        country.label.toLowerCase().indexOf(query.toLowerCase()) !== -1 ||
        country.code.toLowerCase().indexOf(query.toLowerCase()) !== -1 ||
        country.phone.toLowerCase().indexOf(query.toLowerCase()) !== -1
    );
  }

  return inputData;
}
