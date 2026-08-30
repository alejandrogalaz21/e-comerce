import type { IPurchase } from 'src/types/purchase';

// ----------------------------------------------------------------------

/**
 * Downloads a receipt for an order.
 *
 * It takes the order the API actually confirmed, not the checkout context, so a
 * receipt cannot disagree with what was charged.
 *
 * `@react-pdf/renderer` is loaded with a dynamic import: it is a large dependency
 * used on one screen most visitors never open, and it has no business in the
 * main bundle.
 */
export async function downloadReceipt(purchase: IPurchase): Promise<void> {
  const [{ pdf }, { buildReceiptDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./receipt-document'),
  ]);

  const blob = await pdf(buildReceiptDocument(purchase)).toBlob();
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${purchase.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
