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
  displayMonthName: string = '';

  constructor(
    private financialHealth: FinancialHealthService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  async ionViewWillEnter() {
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

    const today = new Date();
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();

    const hasCurrentMonthData = [...expenses].some(e => {
        const { month, year } = this.getLocalMonthYear(e.date);
        return month === targetMonth && year === targetYear;
    }) || [...fuel].some(f => {
        const { month, year } = this.getLocalMonthYear(f.date);
        return month === targetMonth && year === targetYear;
    });

    if (!hasCurrentMonthData && (expenses.length > 0 || fuel.length > 0)) {
        let latestDate = new Date(0);
        [...expenses, ...fuel].forEach(item => {
            const { date } = this.getLocalMonthYear(item.date);
            if (date > latestDate) latestDate = date;
        });
        targetMonth = latestDate.getMonth();
        targetYear = latestDate.getFullYear();
    }

    const dummyDate = new Date(targetYear, targetMonth, 1);
    const formatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
    const monthStr = formatter.format(dummyDate);
    this.displayMonthName = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

    this.currentMonthFixed = expenses
      .filter(e => {
        const { month, year } = this.getLocalMonthYear(e.date);
        return month === targetMonth && year === targetYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    this.currentMonthVariable = fuel
      .filter(f => {
        const { month, year } = this.getLocalMonthYear(f.date);
        return month === targetMonth && year === targetYear;
      })
      .reduce((sum, f) => sum + (f.totalPrice || 0), 0);

    this.cdr.detectChanges();
  }

  async handleRefresh(event: any) {
    if (this.hasIncome) {
      await this.calculateMonthlyExpenses();
    }
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

