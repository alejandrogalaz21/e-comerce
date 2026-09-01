import type { Path, FieldValues, UseFormSetError } from 'react-hook-form';

export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldNames: readonly Path<T>[]
): boolean {
  if (!error || typeof error !== 'object') return false;

  const { message } = error as { message?: string | string[] };

  let messages: string[] = [];
  if (Array.isArray(message)) {
    messages = message;
  } else if (typeof message === 'string') {
    messages = [message];
  }

  let applied = false;

  messages.forEach((msg) => {
    const lower = msg.toLowerCase();
    const field = fieldNames.find((name) => lower.includes(name.toLowerCase()));

    if (field) {
      setError(field, { type: 'server', message: msg }, { shouldFocus: !applied });
      applied = true;
    }
  });

  return applied;
}
