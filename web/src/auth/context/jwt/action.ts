import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';

export type SignInParams = {
  email: string;
  password: string;
};

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export const signInWithPassword = async ({ email, password }: SignInParams): Promise<void> => {
  const res = await axios.post(endpoints.auth.signIn, { email, password });

  const { accessToken } = res.data;

  if (!accessToken) {
    throw new Error('Access token not found in response');
  }

  setSession(accessToken);
};

export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
}: SignUpParams): Promise<void> => {
  const res = await axios.post(endpoints.auth.signUp, { email, password, firstName, lastName });

  const { accessToken } = res.data;

  if (accessToken) {
    setSession(accessToken);
  }
};

export const signOut = async (): Promise<void> => {
  setSession(null);
};
