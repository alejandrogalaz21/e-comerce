import type { IPurchase } from 'src/types/purchase';

import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: '#212B36' },
  title: { fontSize: 20, marginBottom: 4 },
  muted: { color: '#637381' },
  meta: { marginBottom: 24 },
  row: { flexDirection: 'row', paddingVertical: 6 },
  head: { borderBottomWidth: 1, borderBottomColor: '#919EAB', paddingBottom: 6 },
  line: { borderBottomWidth: 1, borderBottomColor: '#F4F6F8' },
  name: { flex: 1 },
  sku: { width: 90 },
  qty: { width: 40, textAlign: 'right' },
  money: { width: 80, textAlign: 'right' },
  total: { flexDirection: 'row', marginTop: 16, justifyContent: 'flex-end' },
  totalLabel: { marginRight: 16, fontSize: 13 },
  totalValue: { width: 80, textAlign: 'right', fontSize: 13 },
});

const money = (value: number) => `$${value.toFixed(2)}`;

/** Kept apart from the download helper so the PDF library is only pulled in on demand. */
export function buildReceiptDocument(purchase: IPurchase) {
  return (
    <Document title={`Receipt ${purchase.id}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Receipt</Text>

        <View style={styles.meta}>
          <Text style={styles.muted}>{`Order ${purchase.id}`}</Text>
          <Text style={styles.muted}>{new Date(purchase.createdAt).toUTCString()}</Text>
          {purchase.paymentReference ? (
            <Text style={styles.muted}>{`Payment ${purchase.paymentReference}`}</Text>
          ) : null}
        </View>

        <View style={[styles.row, styles.head]}>
          <Text style={styles.name}>Product</Text>
          <Text style={styles.sku}>SKU</Text>
          <Text style={styles.qty}>Qty</Text>
          <Text style={styles.money}>Unit</Text>
          <Text style={styles.money}>Subtotal</Text>
        </View>

        {purchase.items.map((item) => (
          <View key={item.id} style={[styles.row, styles.line]}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sku}>{item.sku}</Text>
            <Text style={styles.qty}>{String(item.quantity)}</Text>
            <Text style={styles.money}>{money(item.unitPrice)}</Text>
            <Text style={styles.money}>{money(item.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(purchase.total)}</Text>
        </View>
      </Page>
    </Document>
  );
}
