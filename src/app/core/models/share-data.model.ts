import {
  ExpenseRecord,
  FuelRecord,
  Establishment,
  ProductCatalog,
  Purchase,
  PurchaseItem,
  IndividualExpense,
  ExpenseCategoryTag,
} from '../services/database.service';

/**
 * Centralized list of database tables participating in data transfer.
 */
export const SHARE_TABLES = [
  'expenses',
  'fuelRecords',
  'establishments',
  'products',
  'purchases',
  'purchaseItems',
  'individualExpenses',
  'expenseCategories',
] as const;

export type ShareTableName = (typeof SHARE_TABLES)[number];

export interface ShareDataCollections {
  expenses?: ExpenseRecord[];
  fuelRecords?: FuelRecord[];
  establishments?: Establishment[];
  products?: ProductCatalog[];
  purchases?: Purchase[];
  purchaseItems?: PurchaseItem[];
  individualExpenses?: IndividualExpense[];
  expenseCategories?: ExpenseCategoryTag[];
}

export interface SharePayload {
  app: 'Spendly';
  version: number;
  timestamp: string;
  senderDeviceName?: string;
  data: ShareDataCollections;
}

export interface BluetoothDeviceInfo {
  name: string;
  address: string;
  bonded?: boolean;
}

export interface BluetoothState {
  supported: boolean;
  enabled: boolean;
  hasPermissions: boolean;
}

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface IncomingTransferPrompt {
  senderName: string;
  senderAddress: string;
  totalSize: number;
}

export interface TableTransferStats {
  received: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export interface TransferSummary {
  totalReceived: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  byTable: Partial<Record<ShareTableName, TableTransferStats>>;
  timestamp: string;
  senderDeviceName?: string;
}

export type TransferState =
  | 'idle'
  | 'checking_permissions'
  | 'discovering_devices'
  | 'connecting'
  | 'preparing_data'
  | 'sending'
  | 'waiting_connection'
  | 'incoming_prompt'
  | 'receiving'
  | 'updating_db'
  | 'completed'
  | 'error';
