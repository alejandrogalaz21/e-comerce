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
