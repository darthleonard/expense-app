import { Injectable } from '@angular/core';
import {
  DatabaseService,
  Purchase, PurchaseItem, ProductCatalog,
  Establishment, PriceHistory, PurchaseStatus
} from './database.service';

@Injectable({ providedIn: 'root' })
export class ShoppingService {

  constructor(private db: DatabaseService) {}

  // ─── Establishments ─────────────────────────────────────────────────────────

  getEstablishments() {
    return this.db.establishments.orderBy('name').toArray();
  }

  async getActiveEstablishments() {
    const establishments = await this.getEstablishments();
    return establishments.filter(e => e.isActive);
  }

  async saveEstablishment(est: Establishment): Promise<number> {
    const now = new Date().toISOString();
    const estToSave = { ...est, name: est.name.trim().toLowerCase() };
    if (est.id) {
      await this.db.establishments.update(est.id, { ...estToSave, lastModDate: now });
      return est.id;
    }
    return this.db.establishments.add({ ...estToSave, creationDate: now, lastModDate: now });
  }

  deleteEstablishment(id: number) {
    return this.db.establishments.delete(id);
  }

  // ─── Product Catalog ────────────────────────────────────────────────────────

  getProducts() {
    return this.db.products.orderBy('name').toArray();
  }

  getActiveProducts() {
    return this.db.products.where('isActive').equals(1 as any).sortBy('name');
  }

  searchProducts(query: string) {
    const q = query.toLowerCase();
    return this.db.products
      .filter(p => p.isActive && p.name.toLowerCase().includes(q))
      .toArray();
  }

  async saveProduct(product: ProductCatalog): Promise<number> {
    const now = new Date().toISOString();
    const normalizedName = product.name.trim().toLowerCase();
    const existing = await this.db.products
      .filter(p => p.name.trim().toLowerCase() === normalizedName)
      .first();

    if (existing) {
      if (!product.id || existing.id !== product.id) {
        throw new Error('PRODUCT_NAME_DUPLICATE');
      }
    }

    const productToSave = { ...product, name: normalizedName };
    if (product.id) {
      await this.db.products.update(product.id, { ...productToSave, lastModDate: now });
      return product.id;
    }
    return this.db.products.add({ ...productToSave, creationDate: now, lastModDate: now });
  }

  deleteProduct(id: number) {
    return this.db.products.delete(id);
  }

  // ─── Purchases ──────────────────────────────────────────────────────────────

  async getPurchases(): Promise<Purchase[]> {
    return this.db.purchases.orderBy('creationDate').reverse().toArray();
  }

  async getPurchaseById(id: number): Promise<Purchase | undefined> {
    return this.db.purchases.get(id);
  }

  async savePurchase(purchase: Purchase): Promise<number> {
    const now = new Date().toISOString();
    const purchaseToSave = { ...purchase, name: purchase.name.trim().toLowerCase() };
    if (purchase.id) {
      const changes = { ...purchaseToSave };
      delete changes.id;
      await this.db.purchases.update(purchase.id, changes);
      return purchase.id;
    }
    return this.db.purchases.add({ ...purchaseToSave, creationDate: now });
  }

  async deletePurchase(id: number) {
    await this.db.purchaseItems.where('purchaseId').equals(id).delete();
    await this.db.purchases.delete(id);
  }

  // ─── Purchase Items ─────────────────────────────────────────────────────────

  async getItemsForPurchase(purchaseId: number): Promise<PurchaseItem[]> {
    return this.db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
  }

  async addItemToPurchase(item: PurchaseItem): Promise<number> {
    const now = new Date().toISOString();
    const id = await this.db.purchaseItems.add({ ...item, addedDate: now });
    await this.recalculatePurchaseTotal(item.purchaseId);
    return id;
  }

  async updateItem(item: PurchaseItem) {
    if (!item.id) return;
    item.totalPrice = item.quantity * item.unitPrice;
    await this.db.purchaseItems.update(item.id, item);
    await this.recalculatePurchaseTotal(item.purchaseId);
  }

  async toggleItemBought(item: PurchaseItem) {
    if (!item.id) return;
    await this.db.purchaseItems.update(item.id, { isBought: !item.isBought });
    await this.recalculatePurchaseTotal(item.purchaseId);
  }

  async deleteItem(item: PurchaseItem) {
    if (!item.id) return;
    await this.db.purchaseItems.delete(item.id);
    await this.recalculatePurchaseTotal(item.purchaseId);
  }

  /** Recalculates total from bought items and persists it on the purchase. */
  async recalculatePurchaseTotal(purchaseId: number): Promise<number> {
    const items = await this.db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
    const total = items
      .filter(i => i.isBought)
      .reduce((sum, i) => sum + i.totalPrice, 0);
    await this.db.purchases.update(purchaseId, { totalPriceCalculated: total });
    return total;
  }

  // ─── Complete Purchase & Record Price History ───────────────────────────────

  async completePurchase(purchaseId: number) {
    const now = new Date().toISOString();
    const purchase = await this.db.purchases.get(purchaseId);
    if (!purchase) return;

    await this.db.purchases.update(purchaseId, {
      status: 'completada' as PurchaseStatus
    });

    // Inject bought items into price history
    const items = await this.db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
    const historyRecords: PriceHistory[] = items
      .filter(i => i.isBought && i.productId)
      .map(i => ({
        productId: i.productId!,
        establishmentId: purchase.establishmentId,
        establishmentNameSnap: purchase.establishmentNameSnap,
        price: i.unitPrice,
        recordedDate: now,
        purchaseId,
        quantity: i.quantity
      }));

    if (historyRecords.length > 0) {
      await this.db.priceHistory.bulkAdd(historyRecords);
    }
  }

  async cancelPurchase(purchaseId: number) {
    await this.db.purchases.update(purchaseId, { status: 'cancelada' as PurchaseStatus });
  }

  async rollbackPurchase(purchaseId: number) {
    const purchase = await this.db.purchases.get(purchaseId);
    if (!purchase) return;

    await this.db.purchases.update(purchaseId, {
      status: 'activa' as PurchaseStatus,
      purchaseDate: undefined
    });

    // Remove bought items from price history
    await this.db.priceHistory.where('purchaseId').equals(purchaseId).delete();
  }

  // ─── Analytics helpers ──────────────────────────────────────────────────────

  async getPriceEvolution(productId: number, establishmentId?: number): Promise<PriceHistory[]> {
    let records = await this.db.priceHistory.where('productId').equals(productId).sortBy('recordedDate');
    if (establishmentId !== undefined) {
      records = records.filter(r => r.establishmentId === establishmentId);
    }
    return records;
  }

  async compareStorePrices(productId: number): Promise<PriceHistory[]> {
    const records = await this.db.priceHistory.where('productId').equals(productId).toArray();
    const latestByStore: { [key: number]: PriceHistory } = {};
    records.forEach(r => {
      if (r.establishmentId === undefined) return;
      const existing = latestByStore[r.establishmentId];
      if (!existing || r.recordedDate > existing.recordedDate) {
        latestByStore[r.establishmentId] = r;
      }
    });
    return Object.values(latestByStore).sort((a, b) => a.price - b.price);
  }
}
