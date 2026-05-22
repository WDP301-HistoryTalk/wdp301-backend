export enum EntityType {
  Context = 'Context',
  Character = 'Character',
}

export enum EventEra {
  Ancient = 'Ancient',
  Medieval = 'Medieval',
  Modern = 'Modern',
  Contemporary = 'Contemporary',
}

export enum UserRole {
  Customer = 'customer',
  ContentAdmin = 'content_admin',
  SystemAdmin = 'system_admin',
}

export enum TierTitle {
  Free = 'free',
  Plus = 'plus',
  Pro = 'pro',
}

export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

export enum TransactionStatus {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}
