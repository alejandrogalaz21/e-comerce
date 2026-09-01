const INVALID_CREDENTIALS = 'Incorrect email or password.';

const FALLBACK = 'Something went wrong. Please try again.';

export function getAuthErrorMessage(error: unknown): string {
  if (!error) {
    return FALLBACK;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error !== 'object') {
    return FALLBACK;
  }

  const { statusCode, status, message } = error as {
    statusCode?: number;
    status?: number;
    message?: string | string[];
  };

  if ((statusCode ?? status) === 401) {
    return INVALID_CREDENTIALS;
  }

  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).join(' ');
    return joined || FALLBACK;
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return FALLBACK;
}
