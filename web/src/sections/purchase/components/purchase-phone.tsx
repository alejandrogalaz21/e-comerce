import { parsePhoneNumber } from 'react-phone-number-input';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { FlagIcon } from 'src/components/iconify';

type Props = {
  phone: string;
};

/**
 * The number is stored in international format, so the country it belongs to is
 * information the value already carries: no column is needed to show the flag
 * the checkout form showed while it was typed. A number that cannot be parsed is
 * shown as it was recorded rather than hidden.
 */
export function PurchasePhone({ phone }: Props) {
  if (!phone) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    );
  }

  const country = safeCountry(phone);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      {country && <FlagIcon code={country} sx={{ width: 20, height: 15 }} />}

      <Typography variant="body2" noWrap>
        {phone}
      </Typography>
    </Box>
  );
}

function safeCountry(phone: string): string | undefined {
  try {
    return parsePhoneNumber(phone)?.country;
  } catch {
    return undefined;
  }
}
