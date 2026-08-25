import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// ─── Existing interfaces ──────────────────────────────────────────────────────

export interface Car {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface House {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ExpenseRecord {
  id?: string;
  houseId?: string;
  type: 'housing' | 'electricity' | 'water' | 'gas_bill' | 'telecom';
  amount: number;
  date: string;
  notes?: string;
  creationDate?: string;
  lastModDate?: string;
}

export interface FuelRecord {
  id?: string;
  carId?: string;
  odometer: number;
  unitPrice: number;
  totalPrice: number;
  liters: number;
  date: string;
  creationDate?: string;
  lastModDate?: string;
}

export interface IncomeRecord {
  id?: string;
  amount: number;
  period: 'monthly' | 'biweekly' | 'semimonthly';
  date: string;
}

// ─── Shopping module interfaces ───────────────────────────────────────────────

export interface Establishment {
  id?: string;
  name: string;
  description?: string;
  address?: string;
  isActive: boolean;
  creationDate: string;
  lastModDate: string;
}

export type ExpenseCategory = 'fixed' | 'variable';

export interface ProductCatalog {
  id?: string;
  name: string;
  description?: string;
  category: ExpenseCategory;
  categoryId?: string;
  subCategory?: string;
  code?: string;
  isActive: boolean;
  creationDate: string;
  lastModDate: string;
}

export type PurchaseStatus = 'active' | 'completed' | 'canceled';

export interface Purchase {
  id?: string;
  name: string;
  status: PurchaseStatus;
  creationDate: string;
  purchaseDate?: string;
  notes?: string;
  establishmentId?: string;
  establishmentNameSnap?: string; // historical snapshot
  totalPriceCalculated: number; // sum of bought items only
  isPlanned?: boolean; // true = planned list (items default isBought=false), false/undefined = buying now (isBought=true)
  lastModDate?: string;
}

export interface PurchaseItem {
  id?: string;
  purchaseId: string;
  productId?: string;
  categoryId?: string; // historical snapshot
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
  id?: string;
  productId: string;
  establishmentId?: string;
  establishmentNameSnap?: string;
  price: number;
  recordedDate: string;
  purchaseId?: string;
  quantity: number;
  notes?: string;
}

export interface IndividualExpense {
  id?: string;
  concept: string;
  price: number;
  category: ExpenseCategory;
  categoryId?: string;
  date: string;
  notes?: string;
  creationDate?: string;
  lastModDate?: string;
}

export interface ExpenseCategoryTag {
  id?: string;
  name: string;
  color: string;
  creationDate: string;
  lastModDate: string;
}

/** Normalizes a user-entered string for storage: trimmed + lowercase. */
export function toLower(value: string | undefined | null): string {
  return value?.trim().toLowerCase() ?? '';
}

/** Generates a standard RFC 4122 v4 UUID / GUID. */
export function generateGuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Database ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class DatabaseService extends Dexie {
  expenses!: Table<ExpenseRecord, string>;
  fuelRecords!: Table<FuelRecord, string>;
  cars!: Table<Car, string>;
  houses!: Table<House, string>;
  incomeRecords!: Table<IncomeRecord, string>;
  establishments!: Table<Establishment, string>;
  products!: Table<ProductCatalog, string>;
  purchases!: Table<Purchase, string>;
  purchaseItems!: Table<PurchaseItem, string>;
  priceHistory!: Table<PriceHistory, string>;
  individualExpenses!: Table<IndividualExpense, string>;
  expenseCategories!: Table<ExpenseCategoryTag, string>;

  constructor() {
    super('ExpenseAppDB');
    
    this.version(1)
      .stores({
        cars: 'id, name',
        houses: 'id, name',
        expenses: 'id, houseId, type, amount, date',
        fuelRecords: 'id, carId, odometer, unitPrice, totalPrice, liters, date',
        incomeRecords: 'id, amount, period, date',
        establishments: 'id, name, isActive, creationDate',
        products: 'id, name, category, code, isActive, creationDate',
        purchases:
          'id, name, status, establishmentId, creationDate, purchaseDate',
        purchaseItems: 'id, purchaseId, productId, isBought, addedDate',
        priceHistory:
          'id, productId, establishmentId, [productId+establishmentId], recordedDate, purchaseId',
        individualExpenses: 'id, concept, price, category, date, creationDate'
      });

    this.version(2)
      .stores({
        expenseCategories: 'id, name, creationDate'
      });
  }
}
