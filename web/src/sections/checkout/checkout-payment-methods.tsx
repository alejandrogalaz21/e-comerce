import type { CardProps } from '@mui/material/Card';
import type { PaperProps } from '@mui/material/Paper';
import type { ICheckoutPaymentOption } from 'src/types/checkout';

import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import FormHelperText from '@mui/material/FormHelperText';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  options: ICheckoutPaymentOption[];
};

export function CheckoutPaymentMethods({ options, ...other }: Props) {
  const { control } = useFormContext();

  return (
    <Card {...other}>
      <CardHeader title="Payment" />

      <Controller
        name="payment"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Stack sx={{ px: 3, pb: 3 }}>
            {options.map((option) => (
              <OptionItem
                option={option}
                key={option.value}
                selected={field.value === option.value}
                onClick={() => field.onChange(option.value)}
              />
            ))}

            {!!error && (
              <FormHelperText error sx={{ pt: 1, px: 2 }}>
                {error.message}
              </FormHelperText>
            )}
          </Stack>
        )}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

type OptionItemProps = PaperProps & {
  selected: boolean;
  option: ICheckoutPaymentOption;
};

function OptionItem({ option, selected, ...other }: OptionItemProps) {
  const { value, label, description } = option;

  return (
    <Paper
      variant="outlined"
      key={value}
      sx={{
        p: 2.5,
        mt: 2.5,
        cursor: 'pointer',
        ...(selected && { boxShadow: (theme) => `0 0 0 2px ${theme.vars.palette.text.primary}` }),
      }}
      {...other}
    >
      <ListItemText
        primary={
          <Stack direction="row" alignItems="center">
            <Box component="span" sx={{ flexGrow: 1 }}>
              {label}
            </Box>
            <Stack spacing={1} direction="row" alignItems="center">
              {value === 'credit' && (
                <>
                  <Iconify icon="logos:mastercard" width={24} />
                  <Iconify icon="logos:visa" width={24} />
                </>
              )}
              {value === 'paypal' && <Iconify icon="logos:paypal" width={24} />}
              {value === 'cash' && <Iconify icon="solar:wad-of-money-bold" width={32} />}
            </Stack>
          </Stack>
        }
        secondary={description}
        primaryTypographyProps={{ typography: 'subtitle1', mb: 0.5 }}
        secondaryTypographyProps={{ typography: 'body2' }}
      />
    </Paper>
  );
}
