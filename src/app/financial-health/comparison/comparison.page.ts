import { Component } from '@angular/core';
import { FinancialHealthService, FinancialHealthValues } from '../../core/services/financial-health.service';
import { DatabaseService } from '../../core/services/database.service';
import { ViewWillEnter, AlertController } from '@ionic/angular';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-comparison',
  templateUrl: './comparison.page.html',
  styleUrls: ['./comparison.page.scss'],
  standalone: false,
})
export class ComparisonPage implements ViewWillEnter {
  values: FinancialHealthValues | null = null;
  hasIncome: boolean = false;

  currentMonthFixed: number = 0;
  currentMonthVariable: number = 0;
  selectedMonthIso: string = new Date().toISOString();

  constructor(
    private financialHealth: FinancialHealthService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  async ionViewWillEnter() {
    await this.loadFinancialData();
  }

  async loadFinancialData() {
    const record = await this.financialHealth.getLatestIncome();
    if (record) {
      this.hasIncome = true;
      this.values = this.financialHealth.calculateValues(record.amount, record.period);
      await this.calculateMonthlyExpenses();
    } else {
      this.hasIncome = false;
      this.values = null;
    }
  }

  async onMonthChange(event: any) {
    this.selectedMonthIso = event.detail.value;
    await this.calculateMonthlyExpenses();
  }

  getLocalMonthYear(dateStr: string) {
    if (!dateStr) return { month: -1, year: -1, date: new Date(0) };
    let d: Date;
    if (dateStr.length === 10) {
      const parts = dateStr.split('-');
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      d = new Date(dateStr);
    }
    return { month: d.getMonth(), year: d.getFullYear(), date: d };
  }

  async calculateMonthlyExpenses() {
    const expenses = await this.db.expenses.toArray();
    const fuel = await this.db.fuelRecords.toArray();
    const individual = await this.db.individualExpenses.toArray();
    const purchases = await this.db.purchases.toArray();
    const purchaseItems = await this.db.purchaseItems.toArray();

    const selectedDate = new Date(this.selectedMonthIso);
    let targetMonth = selectedDate.getMonth();
    let targetYear = selectedDate.getFullYear();

    const houseFixed = expenses
      .filter(e => {
        const { month, year } = this.getLocalMonthYear(e.date);
        return month === targetMonth && year === targetYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const fuelFixed = fuel
      .filter(f => {
        const { month, year } = this.getLocalMonthYear(f.date);
        return month === targetMonth && year === targetYear;
      })
      .reduce((sum, f) => sum + (f.totalPrice || 0), 0);

    const individualFixed = individual
      .filter(e => {
        const { month, year } = this.getLocalMonthYear(e.date);
        return month === targetMonth && year === targetYear && e.category === 'fixed';
      })
      .reduce((sum, e) => sum + (e.price || 0), 0);

    const individualVariable = individual
      .filter(e => {
        const { month, year } = this.getLocalMonthYear(e.date);
        return month === targetMonth && year === targetYear && e.category === 'variable';
      })
      .reduce((sum, e) => sum + (e.price || 0), 0);

    this.currentMonthFixed = houseFixed + fuelFixed + individualFixed;
    this.currentMonthVariable = individualVariable;

    const purchasesMonth = purchases.filter(p =>  {
      if(!p.purchaseDate) return false;
      const { month, year } = this.getLocalMonthYear(p.purchaseDate);
      return month === targetMonth && year === targetYear;
    });

    for(const purchase of purchasesMonth) {
      const items = purchaseItems.filter(p => p.purchaseId === purchase.id && p.isBought);
      for(const item of items) {
        if(item.categorySnap  === 'fixed') {
          this.currentMonthFixed += item.totalPrice;
        }

        if(item.categorySnap  === 'variable') {
          this.currentMonthVariable += item.totalPrice;
        } 
      }
    }

    this.cdr.detectChanges();
  }

  async handleRefresh(event: any) {
    await this.loadFinancialData();
    event.target.complete();
  }

  async showHelp() {
    const alert = await this.alertCtrl.create({
      header: 'Ayuda - Comparación',
      message: 'En esta página puedes ver cómo tus gastos actuales del mes se comparan con tu presupuesto sugerido. Si excedes el presupuesto, el valor se mostrará en rojo.',
      buttons: ['OK']
    });
    await alert.present();
  }
}

