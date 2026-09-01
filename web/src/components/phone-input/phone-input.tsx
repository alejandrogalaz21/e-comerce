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

    // The value changes under this component — autofill, a paste, a form that
    // loads an address — and the flag has to follow it instead of staying on the
    // country it happened to have when it mounted. Only a value that actually
    // parses moves it: while a national number is being typed nothing parses,
    // and a country picked by hand must survive that.
    const parsedCountry = value ? parsePhoneNumber(value)?.country : undefined;

    useEffect(() => {
      if (parsedCountry) setSelectedCountry(parsedCountry);
    }, [parsedCountry]);

    /**
     * The library only reports a value it could parse as a national number of the
     * selected country, so an autofilled `528134560078` under a US flag never
     * reaches the form at all — it just sits in the input looking invalid. This
     * reads the raw text and promotes it when it is unmistakably international.
     */
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
        // On the native input, not on the field: MUI puts unknown props on the
        // wrapper, where an input event never arrives.
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
