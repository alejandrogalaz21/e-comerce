import { uuidv4 } from 'src/utils/uuidv4';

// ----------------------------------------------------------------------

/**
 * Minting on entry and never again is what makes the key survive a double click:
 * a key generated on the button would be a new key per press, which is precisely
 * what it exists to prevent.
 */
export function keepOrMintKey(current: string | undefined | null): string {
  return current || uuidv4();
}

/**
 * Whether a checkout should mint a key yet. It must not before the cart has
 * contents: the provider hydrates from storage in an effect, and its children
 * run their effects first, so an earlier write would land on the empty initial
 * state and wipe the stored cart.
 */
export function shouldMintKey(itemCount: number, currentKey: string | undefined | null): boolean {
  return itemCount > 0 && !currentKey;
}
