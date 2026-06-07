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
  type: 'casa' | 'electricidad' | 'agua' | 'gas' | 'telecomunicaciones';
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
  period: 'mensual' | 'catorcenal' | 'quincenal';
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

export type ProductCategory = 'gasto_fijo' | 'gasto_variable';

export interface ProductCatalog {
  id?: number;
  name: string;
  description?: string;
  category: ProductCategory;
  subCategory?: string;
  code?: string;
  isActive: boolean;
  creationDate: string;
  lastModDate: string;
}

export type PurchaseType   = 'individual' | 'planificada';
export type PurchaseStatus = 'activa' | 'completada' | 'cancelada';

export interface Purchase {
  id?: number;
  name: string;
  type: PurchaseType;
  status: PurchaseStatus;
  creationDate: string;
  purchaseDate?: string;
  notes?: string;
  establishmentId?: number;
  establishmentNameSnap?: string;   // historical snapshot
  totalPriceCalculated: number;     // sum of bought items only
}

export interface PurchaseItem {
  id?: number;
  purchaseId: number;
  productId?: number;
  productNameSnap: string;          // historical snapshot
  categorySnap: ProductCategory;    // historical snapshot
  quantity: number;
  unitPrice: number;
  totalPrice: number;               // quantity * unitPrice
  isBought: boolean;
  notes?: string;
  addedDate: string;
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

// ─── Database ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  // v1 tables
  expenses!: Table<ExpenseRecord, number>;
  fuelRecords!: Table<FuelRecord, number>;
  cars!: Table<Car, number>;
  houses!: Table<House, number>;
  incomeRecords!: Table<IncomeRecord, number>;

  // v2 tables — shopping module
  establishments!: Table<Establishment, number>;
  products!: Table<ProductCatalog, number>;
  purchases!: Table<Purchase, number>;
  purchaseItems!: Table<PurchaseItem, number>;
  priceHistory!: Table<PriceHistory, number>;

  constructor() {
    super('ExpenseAppDB');

    this.version(1).stores({
      cars: '++id, name',
      houses: '++id, name',
      expenses: '++id, houseId, type, amount, date',
      fuelRecords: '++id, carId, odometer, unitPrice, totalPrice, liters, date',
      incomeRecords: '++id, amount, period, date'
    });

    this.version(2).stores({
      cars: '++id, name',
      houses: '++id, name',
      expenses: '++id, houseId, type, amount, date',
      fuelRecords: '++id, carId, odometer, unitPrice, totalPrice, liters, date',
      incomeRecords: '++id, amount, period, date',
      // Shopping module — compound indexes enable fast analytics queries
      establishments: '++id, name, isActive, creationDate',
      products: '++id, name, category, code, isActive, creationDate',
      purchases: '++id, name, type, status, establishmentId, creationDate, purchaseDate',
      purchaseItems: '++id, purchaseId, productId, isBought, addedDate',
      priceHistory: '++id, productId, establishmentId, [productId+establishmentId], recordedDate, purchaseId'
    });
  }
}

