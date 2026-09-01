import { it, expect, describe } from 'vitest';

import { getAuthErrorMessage } from './error';

describe('getAuthErrorMessage', () => {
  it('maps a 401 body to a message that does not reveal whether the email exists', () => {
    expect(getAuthErrorMessage({ statusCode: 401, message: 'Invalid credentials' })).toBe(
      'Incorrect email or password.'
    );
  });

  it('maps a 401 reported as `status` too', () => {
    expect(getAuthErrorMessage({ status: 401 })).toBe('Incorrect email or password.');
  });

  it('surfaces the API message for other statuses', () => {
    expect(getAuthErrorMessage({ statusCode: 400, message: 'email must be an email' })).toBe(
      'email must be an email'
    );
  });

  it('joins the validation message list', () => {
    expect(
      getAuthErrorMessage({
        statusCode: 400,
        message: ['email is required', 'password is required'],
      })
    ).toBe('email is required password is required');
  });

  it('uses the message of a thrown Error', () => {
    expect(getAuthErrorMessage(new Error('Access token not found in response'))).toBe(
      'Access token not found in response'
    );
  });

  it('passes a plain string through', () => {
    expect(getAuthErrorMessage('Something went wrong!')).toBe('Something went wrong!');
  });

  it('falls back for empty or unknown shapes', () => {
    expect(getAuthErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getAuthErrorMessage({})).toBe('Something went wrong. Please try again.');
    expect(getAuthErrorMessage({ statusCode: 500, message: '   ' })).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
