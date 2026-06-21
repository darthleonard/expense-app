import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import {
  DatabaseService, Purchase, PurchaseItem,
  ProductCatalog, Establishment, ProductCategory
} from '../../core/services/database.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-detail',
  templateUrl: './purchase-detail.page.html',
  styleUrls: ['./purchase-detail.page.scss'],
  standalone: false
})
export class PurchaseDetailPage implements OnInit {
  purchase: Purchase = { name: '', status: 'activa', creationDate: '', totalPriceCalculated: 0 };
  items: PurchaseItem[] = [];
  originalItems: PurchaseItem[] = [];
  deletedItemIds: number[] = [];
  establishments: Establishment[] = [];

  // Computed totals
  totalBought   = 0;
  countBought   = 0;
  countTotal    = 0;

  // Product search modal
  isAddModalOpen     = false;
  productSearchQuery = '';
  searchResults: ProductCatalog[] = [];
  selectedProduct: ProductCatalog | null = null;
  newItemQty   = 1;
  newItemPrice = 0;
  newItemNote  = '';
  isCreatingNew = false;
  newProductName = '';
  newProductCategory: ProductCategory = 'gasto_variable';
  editingItem: PurchaseItem | null = null;

  // Expanded notes set
  expandedNotes = new Set<number>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shopping: ShoppingService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.router.navigate(['/shopping']);
      return;
    }
    try {
      const p = await this.shopping.getPurchaseById(id);
      if (p) {
        this.purchase = p;
        this.establishments = await this.shopping.getActiveEstablishments();
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
    const dbItems = await this.shopping.getItemsForPurchase(this.purchase.id);
    this.items = dbItems.map(i => ({ ...i }));
    this.originalItems = dbItems.map(i => ({ ...i }));
    this.deletedItemIds = [];
    this.editingItem = null;
    this.recalcTotals();
  }

  recalcTotals() {
    this.countTotal  = this.items.length;
    this.countBought = this.items.filter(i => i.isBought).length;
    this.totalBought = this.items
      .filter(i => i.isBought)
      .reduce((s, i) => s + i.totalPrice, 0);
  }

  // ─── Toggle bought ──────────────────────────────────────────────────────────
  toggleBought(item: PurchaseItem) {
    item.isBought = !item.isBought;
    this.recalcTotals();
  }

  // ─── Notes expand/collapse ──────────────────────────────────────────────────
  toggleNote(id: number) {
    if (this.expandedNotes.has(id)) {
      this.expandedNotes.delete(id);
    } else {
      this.expandedNotes.add(id);
    }
  }

  isNoteExpanded(id: number) { return this.expandedNotes.has(id); }

  // ─── Product search ─────────────────────────────────────────────────────────
  async openAddModal(itemToEdit?: PurchaseItem) {
    this.productSearchQuery = '';
    this.selectedProduct = null;
    this.isCreatingNew = false;
    this.newProductName = '';

    if (itemToEdit) {
      this.editingItem = itemToEdit;
      this.selectedProduct = {
        id: itemToEdit.productId,
        name: itemToEdit.productNameSnap,
        category: itemToEdit.categorySnap,
        isActive: true,
        creationDate: '',
        lastModDate: ''
      };
      this.newItemQty = itemToEdit.quantity;
      this.newItemPrice = itemToEdit.unitPrice;
      this.newItemNote = itemToEdit.notes || '';
      this.searchResults = [];
    } else {
      this.editingItem = null;
      this.newItemQty = 1;
      this.newItemPrice = 0;
      this.newItemNote = '';

      // Load all active products (excluding ones already added)
      const list = await this.shopping.getActiveProducts();
      const existingIds = this.items.map(i => i.productId).filter(Boolean);
      this.searchResults = list.filter(p => !existingIds.includes(p.id));
    }

    this.isAddModalOpen = true;
  }

  async onSearchInput() {
    let list: ProductCatalog[] = [];
    if (this.productSearchQuery.trim().length < 1) {
      list = await this.shopping.getActiveProducts();
    } else {
      list = await this.shopping.searchProducts(this.productSearchQuery);
    }
    const existingIds = this.items.map(i => i.productId).filter(Boolean);
    this.searchResults = list.filter(
      p => !existingIds.includes(p.id) || (this.editingItem && this.editingItem.productId === p.id)
    );
    this.isCreatingNew = false;
    this.selectedProduct = null;
  }

  selectProduct(p: ProductCatalog) {
    this.selectedProduct = p;
    this.isCreatingNew = false;
    this.newItemPrice = 0;
  }

  startCreatingNew() {
    this.isCreatingNew = true;
    this.selectedProduct = null;
    this.newProductName = this.productSearchQuery;
    this.newProductCategory = 'gasto_variable';
    this.newItemPrice = 0;
  }

  async addItemToCart() {
    if (!this.purchase?.id) return;

    let productId: number | undefined;
    let productName = '';
    let categorySnap: ProductCategory = 'gasto_variable';

    if (this.isCreatingNew) {
      if (!this.newProductName.trim()) return;
      try {
        productId = await this.shopping.saveProduct({
          name: this.newProductName.trim(),
          category: this.newProductCategory,
          isActive: true,
          creationDate: new Date().toISOString(),
          lastModDate: new Date().toISOString()
        });
        productName = this.newProductName.trim().toLowerCase();
        categorySnap = this.newProductCategory;
      } catch (err: any) {
        if (err.message === 'PRODUCT_NAME_DUPLICATE') {
          const alert = await this.alertCtrl.create({
            header: await this.translate.get('DUPLICATE_PRODUCT').toPromise(),
            message: await this.translate.get('PRODUCT_EXISTS_REUSE').toPromise(),
            buttons: ['OK']
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
    } else {
      return;
    }

    if (this.newItemQty <= 0) return;

    // Check if same item already added (excluding the one being edited)
    const alreadyAdded = this.items.some(
      i => i.productId === productId && (!this.editingItem || this.editingItem.productId !== productId)
    );
    if (alreadyAdded) {
      const toast = await this.toastCtrl.create({
        message: await this.translate.get('ITEM_ALREADY_ADDED').toPromise(),
        duration: 1800,
        position: 'top'
      });
      await toast.present();
      return;
    }

    const price = this.newItemPrice || 0;

    if (this.editingItem) {
      this.editingItem.productId = productId;
      this.editingItem.productNameSnap = productName;
      this.editingItem.categorySnap = categorySnap;
      this.editingItem.quantity = this.newItemQty;
      this.editingItem.unitPrice = price;
      this.editingItem.totalPrice = this.newItemQty * price;
      this.editingItem.notes = this.newItemNote || undefined;
    } else {
      const item: PurchaseItem = {
        purchaseId: this.purchase.id,
        productId,
        productNameSnap: productName,
        categorySnap,
        quantity: this.newItemQty,
        unitPrice: price,
        totalPrice: this.newItemQty * price,
        isBought: false,
        notes: this.newItemNote || undefined,
        addedDate: new Date().toISOString()
      };
      this.items.push(item);
    }

    this.isAddModalOpen = false;
    this.recalcTotals();
  }

  // ─── Delete item ────────────────────────────────────────────────────────────
  async deleteItem(item: PurchaseItem) {
    if (item.id) {
      this.deletedItemIds.push(item.id);
    }
    this.items = this.items.filter(i => i !== item);
    this.recalcTotals();
  }

  // ─── Has changes validation & Save changes ──────────────────────────────────
  hasChanges(): boolean {
    if (!this.purchase) return false;
    if (this.deletedItemIds.length > 0) return true;
    if (this.items.length !== this.originalItems.length) return true;

    for (const item of this.items) {
      if (!item.id) return true;
      const orig = this.originalItems.find(o => o.id === item.id);
      if (!orig) return true;
      if (
        item.isBought !== orig.isBought ||
        item.quantity !== orig.quantity ||
        item.unitPrice !== orig.unitPrice ||
        item.notes !== orig.notes ||
        item.productId !== orig.productId
      ) {
        return true;
      }
    }
    return false;
  }

  async saveChanges() {
    if (!this.purchase?.id) return;

    // Delete items
    for (const id of this.deletedItemIds) {
      await this.db.purchaseItems.delete(id);
    }
    this.deletedItemIds = [];

    // Save/Update items
    for (const item of this.items) {
      item.totalPrice = item.quantity * item.unitPrice;
      if (item.id) {
        await this.db.purchaseItems.update(item.id, item);
      } else {
        const toAdd = { ...item };
        delete toAdd.id;
        await this.db.purchaseItems.add(toAdd);
      }
    }

    // Recalculate purchase total in the database
    await this.shopping.recalculatePurchaseTotal(this.purchase.id);

    // Reload from database to synchronize state
    await this.loadItems();
    this.showToast('CHANGES_SAVED');
  }

  // ─── Complete / Rollback purchase ───────────────────────────────────────────
  async completePurchase() {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('COMPLETE_PURCHASE').toPromise(),
      message: await this.translate.get('COMPLETE_PURCHASE_CONFIRM').toPromise(),
      buttons: [
        { text: await this.translate.get('CANCEL').toPromise(), role: 'cancel' },
        {
          text: await this.translate.get('CONFIRM').toPromise(),
          handler: async () => {
            await this.shopping.completePurchase(this.purchase.id!);
            this.purchase.status = 'completada';
            this.showToast('PURCHASE_COMPLETED');
          }
        }
      ]
    });
    await alert.present();
  }

  async rollbackPurchase() {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('REOPEN_PURCHASE').toPromise(),
      message: await this.translate.get('REOPEN_PURCHASE_CONFIRM').toPromise(),
      buttons: [
        { text: await this.translate.get('CANCEL').toPromise(), role: 'cancel' },
        {
          text: await this.translate.get('CONFIRM').toPromise(),
          handler: async () => {
            await this.shopping.rollbackPurchase(this.purchase.id!);
            this.purchase.status = 'activa';
            await this.loadItems();
            this.showToast('PURCHASE_REOPENED');
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(key: string) {
    const msg = await this.translate.get(key).toPromise();
    const toast = await this.toastCtrl.create({ message: msg, duration: 1800, position: 'top' });
    await toast.present();
  }

  isActive() { return this.purchase?.status === 'activa'; }
}
