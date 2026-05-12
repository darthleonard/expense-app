import { Component, OnInit } from '@angular/core';
import { DatabaseService, ExpenseRecord, House } from '../core/services/database.service';
import { SettingsService } from '../core/services/settings.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  groupedExpenses: { month: string, expenses: ExpenseRecord[], expanded: boolean, total: number }[] = [];
  houses: House[] = [];
  selectedHouseId: number | null = null;
  
  isModalOpen = false;
  editingExpense: ExpenseRecord | null = null;
  currentExpense: ExpenseRecord = this.getDefaultExpense();

  constructor(private db: DatabaseService, public settings: SettingsService) { }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    this.selectedHouseId = await this.settings.getSelectedHouse();
    await this.loadData();
  }

  async loadData() {
    this.houses = await this.db.houses.toArray();
    
    if (this.houses.length === 1) {
      this.selectedHouseId = this.houses[0].id!;
      await this.settings.setSelectedHouse(this.selectedHouseId);
    } else if (this.selectedHouseId && !this.houses.some(h => h.id === this.selectedHouseId)) {
      this.selectedHouseId = null;
    }

    if (this.houses.length > 0 && !this.selectedHouseId) {
      this.selectedHouseId = this.houses[0].id!;
      await this.settings.setSelectedHouse(this.selectedHouseId);
    } else if (this.houses.length === 0) {
      this.selectedHouseId = null;
    }

    let expenses: ExpenseRecord[] = [];
    if (this.selectedHouseId) {
      const allExpenses = await this.db.expenses.orderBy('date').reverse().toArray();
      expenses = allExpenses.filter(e => e.houseId === this.selectedHouseId);
    }

    const lang = this.settings.currentLang || 'es-MX';
    
    const groups: { [month: string]: ExpenseRecord[] } = {};
    for (const exp of expenses) {
      const dateObj = new Date(exp.date);
      // Format: "YYYY-MM" or "Month YYYY"
      const monthStr = dateObj.toLocaleDateString(lang, { year: 'numeric', month: 'long' });
      const formattedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      
      if (!groups[formattedMonth]) groups[formattedMonth] = [];
      groups[formattedMonth].push(exp);
    }
    
    this.groupedExpenses = Object.keys(groups).map((k, index) => {
      const groupExps = groups[k];
      const total = groupExps.reduce((sum, exp) => sum + exp.amount, 0);
      return {
        month: k,
        expenses: groupExps,
        expanded: index === 0,
        total
      };
    });
  }

  async onHouseChange(event: any) {
    this.selectedHouseId = event.detail.value;
    await this.settings.setSelectedHouse(this.selectedHouseId);
    await this.loadData();
  }

  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  formatDate(isoString: string) {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(this.settings.currentLang || 'es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  }

  getDefaultExpense(): ExpenseRecord {
    return {
      type: 'casa',
      amount: 0,
      date: new Date().toISOString(),
      notes: ''
    };
  }

  openModal(expense?: ExpenseRecord) {
    if (expense) {
      this.editingExpense = expense;
      this.currentExpense = { ...expense };
    } else {
      this.editingExpense = null;
      this.currentExpense = this.getDefaultExpense();
    }
    this.isModalOpen = true;
  }

  async saveExpense() {
    if (!this.selectedHouseId || this.currentExpense.amount <= 0 || !this.currentExpense.date) return;
    
    const now = new Date().toISOString();

    if (this.editingExpense && this.editingExpense.id) {
      await this.db.expenses.update(this.editingExpense.id, {
        ...this.currentExpense,
        houseId: this.selectedHouseId,
        lastModDate: now,
        creationDate: this.editingExpense.creationDate || now
      });
    } else {
      await this.db.expenses.add({
        ...this.currentExpense,
        houseId: this.selectedHouseId,
        creationDate: now,
        lastModDate: now
      });
    }
    this.isModalOpen = false;
    await this.loadData();
  }

  async deleteExpense(expense: ExpenseRecord) {
    if (expense.id) {
      await this.db.expenses.delete(expense.id);
      await this.loadData();
    }
  }

  getIconForType(type: string) {
    switch (type) {
      case 'casa': return 'home';
      case 'electricidad': return 'flash';
      case 'agua': return 'water';
      case 'gas': return 'flame';
      case 'telecomunicaciones': return 'wifi';
      default: return 'cash';
    }
  }

  getHouseIcon(houseId: number | null): string {
    if (!houseId) return 'home';
    const house = this.houses.find(h => h.id === houseId);
    return house?.icon || 'home';
  }
}
