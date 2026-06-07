import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  purchase!: Purchase;
  items: PurchaseItem[] = [];
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

  // Expanded notes set
  expandedNotes = new Set<number>();

  constructor(
    private route: ActivatedRoute,
    private shopping: ShoppingService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const p = await this.shopping.getPurchaseById(id);
    if (p) { this.purchase = p; }
    this.establishments = await this.shopping.getActiveEstablishments();
    await this.loadItems();
  }

  async loadItems() {
    this.items = await this.shopping.getItemsForPurchase(this.purchase.id!);
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
  async toggleBought(item: PurchaseItem) {
    await this.shopping.toggleItemBought(item);
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
  async openAddModal() {
    this.productSearchQuery = '';
    this.searchResults = [];
    this.selectedProduct = null;
    this.newItemQty   = 1;
    this.newItemPrice = 0;
    this.newItemNote  = '';
    this.isCreatingNew = false;
    this.newProductName = '';
    this.isAddModalOpen = true;
  }

  async onSearchInput() {
    if (this.productSearchQuery.trim().length < 1) {
      this.searchResults = await this.shopping.getActiveProducts();
    } else {
      this.searchResults = await this.shopping.searchProducts(this.productSearchQuery);
    }
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
      productId = await this.shopping.saveProduct({
        name: this.newProductName.trim(),
        category: this.newProductCategory,
        isActive: true,
        creationDate: new Date().toISOString(),
        lastModDate: new Date().toISOString()
      });
      productName = this.newProductName.trim();
      categorySnap = this.newProductCategory;
    } else if (this.selectedProduct) {
      productId = this.selectedProduct.id;
      productName = this.selectedProduct.name;
      categorySnap = this.selectedProduct.category;
    } else {
      return;
    }

    if (this.newItemPrice <= 0 || this.newItemQty <= 0) return;

    const item: PurchaseItem = {
      purchaseId: this.purchase.id,
      productId,
      productNameSnap: productName,
      categorySnap,
      quantity: this.newItemQty,
      unitPrice: this.newItemPrice,
      totalPrice: this.newItemQty * this.newItemPrice,
      isBought: false,
      notes: this.newItemNote || undefined,
      addedDate: new Date().toISOString()
    };

    await this.shopping.addItemToPurchase(item);
    this.isAddModalOpen = false;
    await this.loadItems();
  }

  // ─── Delete item ────────────────────────────────────────────────────────────
  async deleteItem(item: PurchaseItem) {
    await this.shopping.deleteItem(item);
    await this.loadItems();
  }

  // ─── Complete / Cancel purchase ─────────────────────────────────────────────
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

  async cancelPurchase() {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('CANCEL_PURCHASE').toPromise(),
      buttons: [
        { text: await this.translate.get('CANCEL').toPromise(), role: 'cancel' },
        {
          text: await this.translate.get('CONFIRM').toPromise(),
          role: 'destructive',
          handler: async () => {
            await this.shopping.cancelPurchase(this.purchase.id!);
            this.purchase.status = 'cancelada';
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
