import { Component, OnInit, ViewChild } from '@angular/core';
import { DatabaseService, ExpenseRecord, House, toLower } from '../core/services/database.service';
import { SettingsService } from '../core/services/settings.service';
import { IonModal } from '@ionic/angular';
import { HasChangesService } from '../core/services/has-changes.service';

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

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private db: DatabaseService, 
    public settings: SettingsService,
    private hasChangesService: HasChangesService
  ) { }

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
      // Parse as local date to avoid UTC timezone shift (YYYY-MM-DD treated as UTC by default)
      const dateObj = exp.date.length === 10 ? new Date(exp.date + 'T00:00:00') : new Date(exp.date);
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

  formatDate(dateStr: string) {
    // Parse as local date to avoid UTC timezone shift
    const d = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
    return new Intl.DateTimeFormat(this.settings.currentLang || 'es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  }

  getDefaultExpense(): ExpenseRecord {
    // Use local date string (YYYY-MM-DD) to avoid UTC timezone shift
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return {
      type: 'casa',
      amount: 0,
      date: localDate,
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

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save') return true;
    
    const isChanged = this.hasChangesService.hasChanges(
      this.editingExpense || this.getDefaultExpense(),
      this.currentExpense
    );
    
    if (isChanged) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  };

  async saveExpense() {
    if (!this.selectedHouseId || this.currentExpense.amount <= 0 || !this.currentExpense.date) return;
    
    const now = new Date().toISOString();

    if (this.editingExpense && this.editingExpense.id) {
      await this.db.expenses.update(this.editingExpense.id, {
        ...this.currentExpense,
        notes: toLower(this.currentExpense.notes),
        houseId: this.selectedHouseId,
        lastModDate: now,
        creationDate: this.editingExpense.creationDate || now
      });
    } else {
      await this.db.expenses.add({
        ...this.currentExpense,
        notes: toLower(this.currentExpense.notes),
        houseId: this.selectedHouseId,
        creationDate: now,
        lastModDate: now
      });
    }
    await this.modal.dismiss(null, 'save');
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
