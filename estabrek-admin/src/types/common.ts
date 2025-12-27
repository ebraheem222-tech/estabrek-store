// src/types/common.ts
export type ID = string;
export type ISODateString = string;

/** JSON compatible value (for Prisma Json fields like payloadJson, PageSection.data) */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export type ApiError = {
  message?: string;
  error?: string;
  code?: string;
  details?: any;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

export type WithTimestamps = {
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

/** Useful when backend returns Prisma Decimal serialized as string */
export type Money = number | string;

export type Nullable<T> = T | null | undefined;
