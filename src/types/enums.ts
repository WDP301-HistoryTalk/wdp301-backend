export enum EntityType {
  Context = 'Context',
  Character = 'Character',
}

export enum EventEra {
  Ancient = 'ANCIENT',
  Medieval = 'MEDIEVAL',
  Modern = 'MODERN',
  Contemporary = 'CONTEMPORARY',
}

export enum EventCategory {
  War = 'WAR',
  Politics = 'POLITICS',
  Culture = 'CULTURE',
  Science = 'SCIENCE',
  Religion = 'RELIGION',
  Other = 'OTHER',
}

export enum UserRole {
  Customer = 'CUSTOMER',
  ContentAdmin = 'CONTENT_ADMIN',
  SystemAdmin = 'SYSTEM_ADMIN',
}

export enum MessageRole {
  User = 'USER',
  Assistant = 'ASSISTANT',
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
