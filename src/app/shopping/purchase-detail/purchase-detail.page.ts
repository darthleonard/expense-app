import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import {
  DatabaseService,
  Purchase,
  PurchaseItem,
  ProductCatalog,
  Establishment,
  ExpenseCategory,
  ExpenseCategoryTag,
  toLower,
  generateGuid,
} from '../../core/services/database.service';
import { CategoryService } from '../../core/services/category.service';
import { HasChangesService } from '../../core/services/has-changes.service';
import { TranslateService } from '@ngx-translate/core';

type PurchaseItemSort =
  | 'added'
  | 'name'
  | 'unitPrice'
  | 'totalPrice'
  | 'quantity'
  | 'category';

type PurchaseSortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-purchase-detail',
  templateUrl: './purchase-detail.page.html',
  styleUrls: ['./purchase-detail.page.scss'],
  standalone: false,
})
export class PurchaseDetailPage implements OnInit {
  purchase: Purchase = {
    name: '',
    status: 'active',
    creationDate: '',
    totalPriceCalculated: 0,
  };
  items: PurchaseItem[] = [];
  originalItems: PurchaseItem[] = [];
  deletedItemIds: string[] = [];
  establishments: Establishment[] = [];
  categories: ExpenseCategoryTag[] = [];
  categoryMap = new Map<string, ExpenseCategoryTag>();
  sortBy: PurchaseItemSort = 'added';
  sortDirection: PurchaseSortDirection = 'asc';

  readonly sortOptions: Array<{ value: PurchaseItemSort; label: string }> = [
    { value: 'added', label: 'SORT_ADDED' },
    { value: 'name', label: 'SORT_NAME' },
    { value: 'unitPrice', label: 'SORT_UNIT_PRICE' },
    { value: 'totalPrice', label: 'SORT_TOTAL_PRICE' },
    { value: 'quantity', label: 'SORT_QUANTITY' },
    { value: 'category', label: 'SORT_CATEGORY' },
  ];

  // Computed totals
  totalBought = 0;
  countBought = 0;
  countTotal = 0;

  // Product search modal
  isAddModalOpen = false;
  productSearchQuery = '';
  searchResults: ProductCatalog[] = [];
  selectedProduct: ProductCatalog | null = null;
  newItemQty = 1;
  newItemPrice = 0;
  newItemNote = '';
  isCreatingNew = false;
  newProductName = '';
  newProductCategory: ExpenseCategory = 'variable';
  newProductCategoryId?: string;
  editItemCategoryId?: string;
  editingItem: PurchaseItem | null = null;

  // Expanded notes set
  expandedNotes = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shopping: ShoppingService,
    private categoryService: CategoryService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private hasChangesService: HasChangesService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/shopping']);
      return;
    }
    try {
      const p = await this.shopping.getPurchaseById(id);
      if (p) {
        this.purchase = p;
        this.establishments = await this.shopping.getActiveEstablishments();
        this.categories = await this.categoryService.getCategories();
        this.categoryMap = await this.categoryService.getCategoryMap();
        await this.loadItems();
      } else {
        this.router.navigate(['/shopping']);
      }
    } catch (e) {
      console.error('Error loading purchase:', e);
      this.router.navigate(['/shopping']);
    }
  }

  async loadItems() {
    if (!this.purchase?.id) return;
    this.categories = await this.categoryService.getCategories();
    this.categoryMap = await this.categoryService.getCategoryMap();
    const dbItems = await this.shopping.getItemsForPurchase(this.purchase.id);
    this.items = dbItems.map((i) => ({ ...i }));
    this.originalItems = dbItems.map((i) => ({ ...i }));
    this.deletedItemIds = [];
    this.editingItem = null;
    this.recalcTotals();
  }

  recalcTotals() {
    this.countTotal = this.items.length;
    this.countBought = this.items.filter((i) => i.isBought).length;
    this.totalBought = this.items
      .filter((i) => i.isBought)
      .reduce((s, i) => s + i.totalPrice, 0);
  }

  get defaultItemIsBought(): boolean {
    return this.purchase?.isPlanned !== true;
  }

  get sortedItems(): PurchaseItem[] {
    const list = [...this.items];
    const directionFactor = this.sortDirection === 'asc' ? 1 : -1;

    switch (this.sortBy) {
      case 'name':
        return list.sort(
          (a, b) =>
            a.productNameSnap.localeCompare(b.productNameSnap) *
              directionFactor ||
            a.productNameSnap.localeCompare(b.productNameSnap)
        );
      case 'unitPrice':
        return list.sort(
          (a, b) =>
            (a.unitPrice - b.unitPrice) * directionFactor ||
            a.productNameSnap.localeCompare(b.productNameSnap)
        );
      case 'totalPrice':
        return list.sort(
          (a, b) =>
            (a.totalPrice - b.totalPrice) * directionFactor ||
            a.productNameSnap.localeCompare(b.productNameSnap)
        );
      case 'quantity':
        return list.sort(
          (a, b) =>
            (a.quantity - b.quantity) * directionFactor ||
            a.productNameSnap.localeCompare(b.productNameSnap)
        );
      case 'category':
        return list.sort(
          (a, b) =>
            a.categorySnap.localeCompare(b.categorySnap) * directionFactor ||
            a.productNameSnap.localeCompare(b.productNameSnap)
        );
      case 'added':
      default:
        return directionFactor === 1 ? list : list.reverse();
    }
  }

  toggleBought(item: PurchaseItem) {
    item.isBought = !item.isBought;
    this.recalcTotals();
  }

  toggleNote(id: string) {
    if (this.expandedNotes.has(id)) {
      this.expandedNotes.delete(id);
    } else {
      this.expandedNotes.add(id);
    }
  }

  isNoteExpanded(id: string) {
    return this.expandedNotes.has(id);
  }

  async openAddModal(itemToEdit?: PurchaseItem) {
    this.productSearchQuery = '';
    this.selectedProduct = null;
    this.isCreatingNew = false;
    this.newProductName = '';
    this.newProductCategoryId = undefined;

    if (itemToEdit) {
      this.editingItem = itemToEdit;
      this.editItemCategoryId = itemToEdit.categoryId;
      this.selectedProduct = {
        id: itemToEdit.productId,
        name: itemToEdit.productNameSnap,
        category: itemToEdit.categorySnap,
        categoryId: itemToEdit.categoryId,
        isActive: true,
        creationDate: '',
        lastModDate: '',
      };
      this.newItemQty = itemToEdit.quantity;
      this.newItemPrice = itemToEdit.unitPrice;
      this.newItemNote = itemToEdit.notes || '';
    } else {
      this.editingItem = null;
      this.editItemCategoryId = undefined;
      this.newItemQty = 1;
      this.newItemPrice = 0;
      this.newItemNote = '';
    }

    this.searchResults = await this.shopping.getActiveProducts();
    this.isAddModalOpen = true;
  }

  async onSearchInput() {
    let list: ProductCatalog[] = [];
    if (this.productSearchQuery.trim().length < 1) {
      list = await this.shopping.getActiveProducts();
    } else {
      list = await this.shopping.searchProducts(this.productSearchQuery);
    }
    this.searchResults = list;
    this.isCreatingNew = false;
    this.selectedProduct = null;
  }

  selectProduct(p: ProductCatalog) {
    this.selectedProduct = p;
    this.editItemCategoryId = p.categoryId;
    this.isCreatingNew = false;
    this.newItemPrice = 0;
  }

  startCreatingNew() {
    this.isCreatingNew = true;
    this.selectedProduct = null;
    this.newProductName = this.productSearchQuery;
    this.newProductCategory = 'variable';
    this.newProductCategoryId = undefined;
    this.editItemCategoryId = undefined;
    this.newItemPrice = 0;
  }

  async addItemToCart() {
    if (!this.purchase?.id) return;

    let productId: string | undefined;
    let productName = '';
    let categorySnap: ExpenseCategory = 'variable';
    let categoryId: string | undefined;

    if (this.isCreatingNew) {
      if (!this.newProductName.trim()) return;
      try {
        productId = await this.shopping.saveProduct({
          name: toLower(this.newProductName),
          category: this.newProductCategory,
          categoryId: this.newProductCategoryId || undefined,
          isActive: true,
          creationDate: new Date().toISOString(),
          lastModDate: new Date().toISOString(),
        });
        productName = toLower(this.newProductName);
        categorySnap = this.newProductCategory;
        categoryId = this.newProductCategoryId;
      } catch (err: any) {
        if (err.message === 'PRODUCT_NAME_DUPLICATE') {
          const alert = await this.alertCtrl.create({
            header: await this.translate.get('DUPLICATE_PRODUCT').toPromise(),
            message: await this.translate
              .get('PRODUCT_EXISTS_REUSE')
              .toPromise(),
            buttons: ['OK'],
          });
          await alert.present();
          return;
        }
        throw err;
      }
    } else if (this.selectedProduct) {
      productId = this.selectedProduct.id;
      productName = this.selectedProduct.name;
      categorySnap = this.selectedProduct.category;
      categoryId = this.editItemCategoryId !== undefined ? this.editItemCategoryId : this.selectedProduct.categoryId;
    } else {
      return;
    }

    if (this.newItemQty <= 0) return;

    // Check if same item already added (excluding the one being edited)
    const alreadyAdded = this.items.some(
      (i) =>
        i.productId === productId &&
        (!this.editingItem || this.editingItem.productId !== productId)
    );
    if (alreadyAdded) {
      const toast = await this.toastCtrl.create({
        message: await this.translate.get('ITEM_ALREADY_ADDED').toPromise(),
        duration: 1800,
        position: 'top',
      });
      await toast.present();
      return;
    }

    const price = this.newItemPrice || 0;

    if (this.editingItem) {
      this.editingItem.productId = productId;
      this.editingItem.productNameSnap = productName;
      this.editingItem.categorySnap = categorySnap;
      this.editingItem.categoryId = this.editItemCategoryId;
      this.editingItem.quantity = this.newItemQty;
      this.editingItem.unitPrice = price;
      this.editingItem.totalPrice = this.newItemQty * price;
      this.editingItem.notes = this.newItemNote
        ? toLower(this.newItemNote)
        : undefined;
    } else {
      const item: PurchaseItem = {
        purchaseId: this.purchase.id,
        productId,
        categoryId,
        productNameSnap: productName,
        categorySnap,
        quantity: this.newItemQty,
        unitPrice: price,
        totalPrice: this.newItemQty * price,
        isBought: this.defaultItemIsBought,
        notes: this.newItemNote ? toLower(this.newItemNote) : undefined,
        addedDate: new Date().toISOString(),
      };
      this.items.push(item);
    }

    this.isAddModalOpen = false;
    this.recalcTotals();
  }

  async deleteItem(item: PurchaseItem) {
    if (item.id) {
      this.deletedItemIds.push(item.id);
    }
    this.items = this.items.filter((i) => i !== item);
    this.recalcTotals();
  }

  hasChanges(): boolean {
    if (!this.purchase) return false;
    if (this.deletedItemIds.length > 0) return true;
    if (this.items.length !== this.originalItems.length) return true;

    for (const item of this.items) {
      if (!item.id) return true;
      const orig = this.originalItems.find((o) => o.id === item.id);
      if (!orig) return true;
      if (
        item.isBought !== orig.isBought ||
        item.quantity !== orig.quantity ||
        item.unitPrice !== orig.unitPrice ||
        item.notes !== orig.notes ||
        item.productId !== orig.productId ||
        item.categoryId !== orig.categoryId
      ) {
        return true;
      }
    }
    return false;
  }

  getCategoryTag(categoryId?: string): ExpenseCategoryTag | undefined {
    return categoryId ? this.categoryMap.get(categoryId) : undefined;
  }

  async canDeactivate(): Promise<boolean> {
    if (this.isActive() && this.hasChanges()) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  }

  async saveChanges() {
    if (!this.purchase?.id) return;

    // Delete items
    for (const id of this.deletedItemIds) {
      await this.db.purchaseItems.delete(id);
    }
    this.deletedItemIds = [];

    const now = new Date().toISOString();
    // Save/Update items
    for (const item of this.items) {
      item.totalPrice = item.quantity * item.unitPrice;
      const itemId = item.id || generateGuid();
      const itemToSave: PurchaseItem = {
        ...item,
        id: itemId,
        addedDate: item.addedDate || now,
        lastModDate: now
      };
      await this.db.purchaseItems.put(itemToSave);
    }

    // Recalculate purchase total in the database
    await this.shopping.recalculatePurchaseTotal(this.purchase.id);

    // Reload from database to synchronize state
    await this.loadItems();
    this.showToast('CHANGES_SAVED');
  }

  async completePurchase() {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('COMPLETE_PURCHASE').toPromise(),
      message: await this.translate
        .get('COMPLETE_PURCHASE_CONFIRM')
        .toPromise(),
      buttons: [
        {
          text: await this.translate.get('CANCEL').toPromise(),
          role: 'cancel',
        },
        {
          text: await this.translate.get('CONFIRM').toPromise(),
          handler: async () => {
            await this.shopping.completePurchase(this.purchase.id!);
            this.purchase.status = 'completed';
            this.showToast('PURCHASE_COMPLETED');
          },
        },
      ],
    });
    await alert.present();
  }

  async rollbackPurchase() {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('REOPEN_PURCHASE').toPromise(),
      message: await this.translate.get('REOPEN_PURCHASE_CONFIRM').toPromise(),
      buttons: [
        {
          text: await this.translate.get('CANCEL').toPromise(),
          role: 'cancel',
        },
        {
          text: await this.translate.get('CONFIRM').toPromise(),
          handler: async () => {
            await this.shopping.rollbackPurchase(this.purchase.id!);
            this.purchase.status = 'active';
            await this.loadItems();
            this.showToast('PURCHASE_REOPENED');
          },
        },
      ],
    });
    await alert.present();
  }

  async showToast(key: string) {
    const msg = await this.translate.get(key).toPromise();
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 1800,
      position: 'top',
    });
    await toast.present();
  }

  isActive() {
    return this.purchase?.status === 'active';
  }
}
