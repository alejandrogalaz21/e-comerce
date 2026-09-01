/* eslint-disable no-bitwise */

/**
 * The checkout's idempotency key is one of these, and replaying a key returns
 * that order with its shipping address. So the value has to be unguessable, and
 * `Math.random()` is not: it is a fast PRNG whose state can be recovered from
 * its own output. It stays only as the last resort for a browser without the
 * Web Crypto API.
 */
export function uuidv4() {
  const webCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
