import { uuidv4 } from 'src/utils/uuidv4';

export function keepOrMintKey(current: string | undefined | null): string {
  return current || uuidv4();
}

export function shouldMintKey(itemCount: number, currentKey: string | undefined | null): boolean {
  return itemCount > 0 && !currentKey;
}
