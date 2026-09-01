import type { Dayjs } from 'dayjs';

export type IPaymentCard = {
  id: string;
  cardType: string;
  primary?: boolean;
  cardNumber: string;
};

export type IAddressItem = {
  id?: string;
  name: string;
  company?: string;
  primary?: boolean;
  /** One line, for display. The API is given the parts below instead. */
  fullAddress: string;
  phoneNumber?: string;
  email?: string;
  addressType?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

export type IDateValue = string | number | null;

export type IPaginationMeta = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
};

export type IPaginatedResponse<T> = {
  data: T[];
  pagination: IPaginationMeta;
};

export type IDatePickerControl = Dayjs | null;

export type ISocialLink = {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
};
