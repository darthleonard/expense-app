import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonModal } from '@ionic/angular';
import { DatabaseService, IndividualExpense, ExpenseCategoryTag, ProductCatalog, toLower, generateGuid } from '../core/services/database.service';
import { CategoryService } from '../core/services/category.service';
import { ShoppingService } from '../core/services/shopping.service';
import { TranslateService } from '@ngx-translate/core';
import { HasChangesService } from '../core/services/has-changes.service';
import { SettingsService } from '../core/services/settings.service';

@Component({
  selector: 'app-individual-expenses',
  templateUrl: './individual-expenses.page.html',
  styleUrls: ['./individual-expenses.page.scss'],
  standalone: false
})
export class IndividualExpensesPage implements OnInit {
  selectedMonthIso: string = new Date().toISOString();
  expenses: IndividualExpense[] = [];
  filteredExpenses: IndividualExpense[] = [];
  categories: ExpenseCategoryTag[] = [];
  categoryMap = new Map<string, ExpenseCategoryTag>();
  isModalOpen = false;
  isSaving = false;
  editingExpense: IndividualExpense | null = null;
  currentExpense: IndividualExpense = this.getDefaultExpense();

  searchQuery = '';
  categoryFilter: 'all' | 'fixed' | 'variable' = 'all';

  // KPI metrics
  totalSpent = 0;
  totalFixed = 0;
  totalVariable = 0;

  // Product selector state
  allProducts: ProductCatalog[] = [];
  filteredProducts: ProductCatalog[] = [];
  selectedProduct: ProductCatalog | null = null;
  productSearchQuery = '';
  showProductList = false;

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private db: DatabaseService,
    private categoryService: CategoryService,
    private shopping: ShoppingService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private hasChangesService: HasChangesService,
    public settings: SettingsService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.settings.init();
    await this.loadData();
  }

  async loadData() {
    this.categories = await this.categoryService.getCategories();
    this.categoryMap = await this.categoryService.getCategoryMap();
    this.allProducts = await this.shopping.getActiveProducts();

    const selectedDate = new Date(this.selectedMonthIso);
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const nextMonth = new Date(targetYear, targetMonth, 1); 
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    const data = await this.db.individualExpenses
      .where('date').between(startDate, endDate, true, false)
      .toArray();
    // Sort by date descending, then creation date descending
    this.expenses = data.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const creationA = a.creationDate ? new Date(a.creationDate).getTime() : 0;
      const creationB = b.creationDate ? new Date(b.creationDate).getTime() : 0;
      return creationB - creationA;
    });
    this.applyFilter();
  }

  onMonthChange(event: any) {
    this.selectedMonthIso = event.detail.value;
    this.loadData();
  }

  applyFilter() {
    let list = this.expenses.filter(e => new Date(e.date).getFullYear() === new Date(this.selectedMonthIso).getFullYear() && new Date(e.date).getMonth() === new Date(this.selectedMonthIso).getMonth());

    if (this.categoryFilter !== 'all') {
      list = list.filter(e => e.category === this.categoryFilter);
    }

    if (this.searchQuery.trim().length > 0) {
      const query = this.searchQuery.trim().toLowerCase();
      list = list.filter(e => e.concept.toLowerCase().includes(query) || (e.notes && e.notes.toLowerCase().includes(query)));
    }

    this.filteredExpenses = list;

    // KPI summary metrics (overall totals)
    this.totalSpent = list.reduce((sum, e) => sum + e.price, 0);
    this.totalFixed = list.filter(e => e.category === 'fixed').reduce((sum, e) => sum + e.price, 0);
    this.totalVariable = list.filter(e => e.category === 'variable').reduce((sum, e) => sum + e.price, 0);
  }

  getDefaultExpense(): IndividualExpense {
    return {
      concept: '',
      price: 0,
      category: 'variable',
      categoryId: undefined,
      productId: undefined,
      date: new Date().toISOString(),
      notes: ''
    };
  }

  openModal(expense?: IndividualExpense) {
    this.isSaving = false;
    this.productSearchQuery = '';
    this.showProductList = false;

    if (expense) {
      this.editingExpense = expense;
      this.currentExpense = { ...expense };

      // Restore the previously linked product if it still exists in the catalog
      if (expense.productId) {
        this.selectedProduct = this.allProducts.find(p => p.id === expense.productId) ?? null;
      } else {
        this.selectedProduct = null;
      }
    } else {
      this.editingExpense = null;
      this.currentExpense = this.getDefaultExpense();
      this.selectedProduct = null;
    }

    this.filteredProducts = [...this.allProducts];
    this.isModalOpen = true;
  }

  onProductSearch() {
    const q = this.productSearchQuery.trim().toLowerCase();
    this.filteredProducts = q
      ? this.allProducts.filter(p => p.name.toLowerCase().includes(q))
      : [...this.allProducts];
    this.showProductList = true;
  }

  onProductSearchFocus() {
    this.showProductList = true;
    if (!this.productSearchQuery.trim()) {
      this.filteredProducts = [...this.allProducts];
    }
  }

  async onProductSelected(product: ProductCatalog) {
    const previousProductName = this.selectedProduct?.name ?? null;
    this.selectedProduct = product;
    this.currentExpense.productId = product.id;
    this.productSearchQuery = '';
    this.showProductList = false;

    // Prefill concept only when empty or still equal to the previous product's name
    const currentConcept = this.currentExpense.concept.trim();
    if (!currentConcept || (previousProductName && currentConcept === previousProductName)) {
      this.currentExpense.concept = product.name;
    }

    // Preselect expense category from the product (user can still change it)
    if (product.categoryId) {
      this.currentExpense.categoryId = product.categoryId;
    }

    // Prefill price from the latest price history entry if one exists
    if (product.id) {
      try {
        const history = await this.shopping.getPriceEvolution(product.id);
        if (history && history.length > 0) {
          const latest = history[history.length - 1];
          if (latest.price > 0) {
            this.currentExpense.price = latest.price;
          }
        }
      } catch {
        // Price history unavailable — leave price as-is for the user to enter
      }
    }
  }

  clearProduct() {
    // Clear only the product reference; preserve all other expense data
    this.selectedProduct = null;
    this.currentExpense.productId = undefined;
    this.productSearchQuery = '';
    this.showProductList = false;
    this.filteredProducts = [...this.allProducts];
  }

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save' || this.isSaving) return true;

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
    if (!this.currentExpense.concept.trim()) {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('UNSAVED_CHANGES'),
        message: this.translate.instant('CONCEPT_REQUIRED'),
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (!this.currentExpense.price || this.currentExpense.price <= 0) {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('UNSAVED_CHANGES'),
        message: this.translate.instant('PRICE_REQUIRED'),
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.isSaving = true;
    try {
      const now = new Date().toISOString();
      const id = this.editingExpense?.id || generateGuid();
      const payload: IndividualExpense = {
        id,
        concept: toLower(this.currentExpense.concept),
        price: this.currentExpense.price,
        category: this.currentExpense.category,
        categoryId: this.currentExpense.categoryId || undefined,
        productId: this.currentExpense.productId || undefined,
        date: this.currentExpense.date,
        notes: this.currentExpense.notes ? toLower(this.currentExpense.notes) : '',
        creationDate: this.editingExpense?.creationDate || now,
        lastModDate: now
      };

      await this.db.individualExpenses.put(payload);

      this.isModalOpen = false;
      await this.loadData();
    } catch (err) {
      this.isSaving = false;
      console.error(err);
    }
  }

  getCategoryTag(categoryId?: string): ExpenseCategoryTag | undefined {
    return categoryId ? this.categoryMap.get(categoryId) : undefined;
  }

  async deleteExpense(expense: IndividualExpense) {
    if (!expense.id) return;

    const alert = await this.alertCtrl.create({
      header: this.translate.instant('DELETE_EXPENSE'),
      message: this.translate.instant('DELETE_EXPENSE_CONFIRM'),
      buttons: [
        { text: this.translate.instant('CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.db.individualExpenses.delete(expense.id!);
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }

  onFilterChange() {
    this.applyFilter();
  }

  onSearchInput() {
    this.applyFilter();
  }
}
