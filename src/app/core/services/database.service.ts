import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// ─── Existing interfaces ──────────────────────────────────────────────────────

export interface Car {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface House {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface ExpenseRecord {
  id?: number;
  houseId?: number;
  type: 'housing' | 'electricity' | 'water' | 'gas_bill' | 'telecom';
  amount: number;
  date: string;
  notes?: string;
  creationDate?: string;
  lastModDate?: string;
}

export interface FuelRecord {
  id?: number;
  carId?: number;
  odometer: number;
  unitPrice: number;
  totalPrice: number;
  liters: number;
  date: string;
  creationDate?: string;
  lastModDate?: string;
}

export interface IncomeRecord {
  id?: number;
  amount: number;
  period: 'monthly' | 'biweekly' | 'semimonthly';
  date: string;
}

// ─── Shopping module interfaces ───────────────────────────────────────────────

export interface Establishment {
  id?: number;
  name: string;
  description?: string;
  address?: string;
  isActive: boolean;
  creationDate: string;
  lastModDate: string;
}

export type ExpenseCategory = 'fixed' | 'variable';

export interface ProductCatalog {
  id?: number;
  name: string;
  description?: string;
  category: ExpenseCategory;
  subCategory?: string;
  code?: string;
  isActive: boolean;
  creationDate: string;
  lastModDate: string;
}

export type PurchaseStatus = 'active' | 'completed' | 'canceled';

export interface Purchase {
  id?: number;
  name: string;
  status: PurchaseStatus;
  creationDate: string;
  purchaseDate?: string;
  notes?: string;
  establishmentId?: number;
  establishmentNameSnap?: string; // historical snapshot
  totalPriceCalculated: number; // sum of bought items only
  isPlanned?: boolean; // true = planned list (items default isBought=false), false/undefined = buying now (isBought=true)
  lastModDate?: string;
}

export interface PurchaseItem {
  id?: number;
  purchaseId: number;
  productId?: number;
  productNameSnap: string; // historical snapshot
  categorySnap: ExpenseCategory; // historical snapshot
  quantity: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
  isBought: boolean;
  notes?: string;
  addedDate: string;
  lastModDate?: string;
}

export interface PriceHistory {
  id?: number;
  productId: number;
  establishmentId?: number;
  establishmentNameSnap?: string;
  price: number;
  recordedDate: string;
  purchaseId?: number;
  quantity: number;
  notes?: string;
}

export interface IndividualExpense {
  id?: number;
  concept: string;
  price: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  creationDate?: string;
  lastModDate?: string;
}

/** Normalizes a user-entered string for storage: trimmed + lowercase. */
export function toLower(value: string | undefined | null): string {
  return value?.trim().toLowerCase() ?? '';
}

// ─── Database ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class DatabaseService extends Dexie {
  expenses!: Table<ExpenseRecord, number>;
  fuelRecords!: Table<FuelRecord, number>;
  cars!: Table<Car, number>;
  houses!: Table<House, number>;
  incomeRecords!: Table<IncomeRecord, number>;
  establishments!: Table<Establishment, number>;
  products!: Table<ProductCatalog, number>;
  purchases!: Table<Purchase, number>;
  purchaseItems!: Table<PurchaseItem, number>;
  priceHistory!: Table<PriceHistory, number>;
  individualExpenses!: Table<IndividualExpense, number>;

  constructor() {
    super('ExpenseAppDB');
    
    this.version(1)
      .stores({
        cars: '++id, name',
        houses: '++id, name',
        expenses: '++id, houseId, type, amount, date',
        fuelRecords: '++id, carId, odometer, unitPrice, totalPrice, liters, date',
        incomeRecords: '++id, amount, period, date',
        establishments: '++id, name, isActive, creationDate',
        products: '++id, name, category, code, isActive, creationDate',
        purchases:
          '++id, name, status, establishmentId, creationDate, purchaseDate',
        purchaseItems: '++id, purchaseId, productId, isBought, addedDate',
        priceHistory:
          '++id, productId, establishmentId, [productId+establishmentId], recordedDate, purchaseId',
        individualExpenses: '++id, concept, price, category, date, creationDate'
      });
  }
}
