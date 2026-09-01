import { z as zod } from 'zod';

export type NewProductSchemaType = zod.infer<typeof NewProductSchema>;

const HTML_TAG_PATTERN = /<[^>]*>/;

export const NewProductSchema = zod.object({
  name: zod
    .string()
    .trim()
    .min(1, { message: 'Name is required!' })
    .max(255, { message: 'Name must be at most 255 characters!' })
    .refine((value) => !HTML_TAG_PATTERN.test(value), {
      message: 'HTML markup is not allowed!',
    }),
  sku: zod
    .string()
    .trim()
    .min(1, { message: 'SKU is required!' })
    .max(50, { message: 'SKU must be at most 50 characters!' })
    .regex(/^[A-Za-z0-9-]+$/, { message: 'SKU can only contain letters, numbers and dashes!' }),
  description: zod
    .string()
    .trim()
    .max(2000, { message: 'Description must be at most 2000 characters!' })
    .refine((value) => !HTML_TAG_PATTERN.test(value), {
      message: 'HTML markup is not allowed!',
    }),
  category: zod.string().trim(),
  price: zod
    .number({ invalid_type_error: 'Price must be a number!' })
    .min(0, { message: 'Price must be 0 or greater!' })
    .multipleOf(0.01, { message: 'Price can have at most 2 decimals!' }),
  stock: zod
    .number({ invalid_type_error: 'Stock must be a number!' })
    .int({ message: 'Stock must be an integer!' })
    .min(0, { message: 'Stock must be 0 or greater!' }),
  weightKg: zod.string().refine(
    (value) => {
      if (value.trim() === '') return true;
      const parsed = Number(value);
      return !Number.isNaN(parsed) && parsed >= 0;
    },
    { message: 'Weight must be a number greater than or equal to 0!' }
  ),
});
