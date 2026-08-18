import { Injectable } from '@angular/core';
import { DatabaseService, IncomeRecord, generateGuid } from './database.service';

export interface FinancialHealthValues {
  monthlyIncome: number;
  fixedExpensesBudget: number; // 50%
  variableExpensesBudget: number; // 20%
  wealthBuilding: number; // 30%
  peaceFund: number; // 10%
  personalProjects: number; // 10%
  retirementSavings: number; // 10%
}

@Injectable({
  providedIn: 'root'
})
export class FinancialHealthService {
  constructor(private db: DatabaseService) {}

  async saveIncome(amount: number, period: 'monthly' | 'biweekly' | 'semimonthly'): Promise<void> {
    const record: IncomeRecord = {
      id: generateGuid(),
      amount,
      period,
      date: new Date().toISOString()
    };
    await this.db.incomeRecords.put(record);
  }

  async getLatestIncome(): Promise<IncomeRecord | undefined> {
    const records = await this.db.incomeRecords.orderBy('date').reverse().toArray();
    return records.length > 0 ? records[0] : undefined;
  }

  async getAllIncomeHistory(): Promise<IncomeRecord[]> {
    return await this.db.incomeRecords.orderBy('date').reverse().toArray();
  }

  async deleteIncomeRecord(id: string): Promise<void> {
    await this.db.incomeRecords.delete(id);
  }

  async clearIncomeHistory(): Promise<void> {
    await this.db.incomeRecords.clear();
  }

  calculateValues(baseAmount: number, period: 'monthly' | 'biweekly' | 'semimonthly'): FinancialHealthValues {
    const monthlyIncome = (period === 'biweekly' || period === 'semimonthly') ? baseAmount * 2 : baseAmount;
    
    return {
      monthlyIncome,
      fixedExpensesBudget: monthlyIncome * 0.50,
      variableExpensesBudget: monthlyIncome * 0.20,
      wealthBuilding: monthlyIncome * 0.30,
      peaceFund: monthlyIncome * 0.10,
      personalProjects: monthlyIncome * 0.10,
      retirementSavings: monthlyIncome * 0.10
    };
  }
}

