import type { IProductItem } from 'src/types/product';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { toApiPayload } from 'src/actions/product.mapper';

import { Form, Field } from 'src/components/hook-form';

import { useCreateProduct, useUpdateProduct } from './hooks/use-product';

// ----------------------------------------------------------------------

export type NewProductSchemaType = zod.infer<typeof NewProductSchema>;

export const NewProductSchema = zod.object({
  name: zod
    .string()
    .trim()
    .min(1, { message: 'Name is required!' })
    .max(255, { message: 'Name must be at most 255 characters!' }),
  sku: zod
    .string()
    .trim()
    .min(1, { message: 'SKU is required!' })
    .max(50, { message: 'SKU must be at most 50 characters!' })
    .regex(/^[A-Za-z0-9-]+$/, { message: 'SKU can only contain letters, numbers and dashes!' }),
  description: zod
    .string()
    .trim()
    .max(2000, { message: 'Description must be at most 2000 characters!' }),
  category: zod.string().trim(),
  price: zod
    .number({ invalid_type_error: 'Price must be a number!' })
    .min(0, { message: 'Price must be 0 or greater!' })
    .multipleOf(0.01, { message: 'Price can have at most 2 decimals!' }),
  stock: zod
    .number({ invalid_type_error: 'Stock must be a number!' })
    .int({ message: 'Stock must be an integer!' })
    .min(0, { message: 'Stock must be 0 or greater!' }),
  weightKg: zod.string().refine((value) => {
    if (value.trim() === '') return true;
    const parsed = Number(value);
    return !Number.isNaN(parsed) && parsed >= 0;
  }, { message: 'Weight must be a number greater than or equal to 0!' }),
});

// ----------------------------------------------------------------------

type Props = {
  currentProduct?: IProductItem;
};

export function ProductNewEditForm({ currentProduct }: Props) {
  const router = useRouter();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const defaultValues = useMemo(
    () => ({
      name: currentProduct?.name || '',
      sku: currentProduct?.sku || '',
      description: currentProduct?.description || '',
      category: currentProduct?.category || '',
      price: currentProduct?.price ?? 0,
      stock: currentProduct?.stock ?? 0,
      weightKg: currentProduct?.weightKg == null ? '' : String(currentProduct.weightKg),
    }),
    [currentProduct]
  );

  const methods = useForm<NewProductSchemaType>({
    resolver: zodResolver(NewProductSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentProduct) {
      reset(defaultValues);
    }
  }, [currentProduct, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const payload = toApiPayload(data);

    try {
      if (currentProduct) {
        await updateProduct.mutateAsync({ id: currentProduct.id, payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      router.push(paths.dashboard.product.root);
    } catch {
      // errors are surfaced by the mutation hooks
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={{ xs: 3, md: 5 }} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
        <Card>
          <CardHeader title="Details" subheader="Name, SKU, description..." sx={{ mb: 3 }} />

          <Divider />

          <Stack spacing={3} sx={{ p: 3 }}>
            <Field.Text name="name" label="Product name" />

            <Field.Text name="sku" label="SKU" />

            <Field.Text name="description" label="Description" multiline rows={4} />

            <Field.Text name="category" label="Category" placeholder="Uncategorized" />
          </Stack>
        </Card>

        <Card>
          <CardHeader title="Pricing and inventory" sx={{ mb: 3 }} />

          <Divider />

          <Stack spacing={3} sx={{ p: 3 }}>
            <Box
              columnGap={2}
              rowGap={3}
              display="grid"
              gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' }}
            >
              <Field.Text
                name="price"
                label="Price"
                placeholder="0.00"
                type="number"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        $
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />

              <Field.Text
                name="stock"
                label="Stock"
                placeholder="0"
                type="number"
                InputLabelProps={{ shrink: true }}
              />

              <Field.Text
                name="weightKg"
                label="Weight (kg)"
                placeholder="0.000"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Stack>
        </Card>

        <Stack direction="row" justifyContent="flex-end">
          <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting}>
            {!currentProduct ? 'Create product' : 'Save changes'}
          </LoadingButton>
        </Stack>
      </Stack>
    </Form>
  );
}
