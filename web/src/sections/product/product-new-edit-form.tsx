import type { IProductItem } from 'src/types/product';

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

import { Form, Field, applyServerFieldErrors } from 'src/components/hook-form';

import { NewProductSchema } from './product-schema';
import { useCreateProduct, useUpdateProduct } from './hooks/use-product';

import type { NewProductSchemaType } from './product-schema';

export { NewProductSchema } from './product-schema';

export type { NewProductSchemaType } from './product-schema';

const PRODUCT_FIELD_NAMES = [
  'sku',
  'name',
  'description',
  'category',
  'price',
  'stock',
  'weightKg',
] as const satisfies readonly (keyof NewProductSchemaType)[];

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
    setError,
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
    } catch (error) {
      applyServerFieldErrors(error, setError, PRODUCT_FIELD_NAMES);
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
