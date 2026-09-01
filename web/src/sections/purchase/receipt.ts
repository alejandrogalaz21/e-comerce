import type { IPurchase } from 'src/types/purchase';

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
