import type { FormEvent } from 'react';
import type { TextFieldProps } from '@mui/material/TextField';
import type { Value, Country } from 'react-phone-number-input/input';

import { useState, useEffect, forwardRef } from 'react';
import { parsePhoneNumber } from 'react-phone-number-input';
import PhoneNumberInput from 'react-phone-number-input/input';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { CountryListPopover } from './list';
import { getCountryCode, normalizePhoneValue } from './utils';

import type { PhoneInputProps } from './types';

export const PhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(
  ({ value, onChange, placeholder, country: inputCountryCode, disableSelect, ...other }, ref) => {
    const defaultCountryCode = getCountryCode(value, inputCountryCode);

    const [selectedCountry, setSelectedCountry] = useState(defaultCountryCode);

    const parsedCountry = value ? parsePhoneNumber(value)?.country : undefined;

    useEffect(() => {
      if (parsedCountry) setSelectedCountry(parsedCountry);
    }, [parsedCountry]);

    const handleRawInput = (event: FormEvent<HTMLInputElement>) => {
      const normalized = normalizePhoneValue(event.currentTarget.value, selectedCountry);

      if (normalized && normalized !== value && normalized.startsWith('+')) {
        onChange(normalized as Value);
      }
    };

    return (
      <PhoneNumberInput
        ref={ref}
        country={selectedCountry}
        inputComponent={CustomInput}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? 'Enter phone number'}
        inputProps={{ onInput: handleRawInput }}
        InputProps={
          disableSelect
            ? undefined
            : {
                startAdornment: (
                  <InputAdornment position="start" sx={{ ml: 1 }}>
                    <CountryListPopover
                      countryCode={selectedCountry}
                      onClickCountry={(inputValue: Country) => setSelectedCountry(inputValue)}
                    />
                  </InputAdornment>
                ),
              }
        }
        {...other}
      />
    );
  }
);

const CustomInput = forwardRef<HTMLInputElement, TextFieldProps>(({ ...props }, ref) => (
  <TextField inputRef={ref} {...props} />
));
