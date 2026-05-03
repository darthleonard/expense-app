import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

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
  date: string; // ISO string
  notes?: string;
}

export interface FuelRecord {
  id?: number;
  carId?: number;
  odometer: number;
  unitPrice: number;
  totalPrice: number;
  liters: number;
  date: string; // ISO string
}

export interface IncomeRecord {
  id?: number;
  amount: number;
  period: 'mensual' | 'catorcenal' | 'quincenal';
  date: string; // ISO string
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  expenses!: Table<ExpenseRecord, number>;
  fuelRecords!: Table<FuelRecord, number>;
  cars!: Table<Car, number>;
  houses!: Table<House, number>;
  incomeRecords!: Table<IncomeRecord, number>;

  constructor() {
    super('ExpenseAppDB');
    this.version(1).stores({
      expenses: '++id, type, amount, date',
      fuelRecords: '++id, odometer, unitPrice, totalPrice, liters, date'
    });

    this.version(2).stores({
      cars: '++id, name',
      houses: '++id, name',
      expenses: '++id, houseId, type, amount, date',
      fuelRecords: '++id, carId, odometer, unitPrice, totalPrice, liters, date'
    });

    this.version(3).stores({
      incomeRecords: '++id, amount, period, date'
    });
  }
}
