import { Injectable } from '@angular/core';
import {
  DatabaseService,
  Purchase, PurchaseItem, ProductCatalog,
  Establishment, PriceHistory, PurchaseStatus, toLower, generateGuid
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

  async saveEstablishment(est: Establishment): Promise<string> {
    const now = new Date().toISOString();
    const id = est.id || generateGuid();
    const estToSave: Establishment = {
      ...est,
      id,
      name: toLower(est.name),
      description: toLower(est.description),
      address: toLower(est.address),
      creationDate: est.creationDate || now,
      lastModDate: now
    };
    await this.db.establishments.put(estToSave);
    return id;
  }

  deleteEstablishment(id: string) {
    return this.db.establishments.delete(id);
  }

  // ─── Product Catalog ────────────────────────────────────────────────────────

  getProducts() {
    return this.db.products.orderBy('name').toArray();
  }

  async getActiveProducts() {
    const products = await this.getProducts();
    return products.filter(p => p.isActive).sort((a, b) => a.name.localeCompare(b.name));
  }

  searchProducts(query: string) {
    const q = query.toLowerCase();
    return this.db.products
      .filter(p => p.isActive && p.name.toLowerCase().includes(q))
      .toArray();
  }

  async saveProduct(product: ProductCatalog): Promise<string> {
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

    const id = product.id || generateGuid();
    const productToSave: ProductCatalog = {
      ...product,
      id,
      name: normalizedName,
      description: toLower(product.description),
      creationDate: product.creationDate || now,
      lastModDate: now
    };
    await this.db.products.put(productToSave);
    return id;
  }

  deleteProduct(id: string) {
    return this.db.products.delete(id);
  }

  // ─── Purchases ──────────────────────────────────────────────────────────────

  async getPurchases(): Promise<Purchase[]> {
    return this.db.purchases.orderBy('creationDate').reverse().toArray();
  }

  async getPurchaseById(id: string): Promise<Purchase | undefined> {
    return this.db.purchases.get(id);
  }

  async savePurchase(purchase: Purchase): Promise<string> {
    const now = new Date().toISOString();
    const id = purchase.id || generateGuid();
    const purchaseToSave: Purchase = {
      ...purchase,
      id,
      name: toLower(purchase.name),
      notes: toLower(purchase.notes),
      establishmentNameSnap: toLower(purchase.establishmentNameSnap),
      creationDate: purchase.creationDate || now,
      lastModDate: now
    };
    await this.db.purchases.put(purchaseToSave);
    return id;
  }

  async deletePurchase(id: string) {
    await this.db.purchaseItems.where('purchaseId').equals(id).delete();
    await this.db.purchases.delete(id);
  }

  // ─── Purchase Items ─────────────────────────────────────────────────────────

  async getItemsForPurchase(purchaseId: string): Promise<PurchaseItem[]> {
    return this.db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
  }

  async addItemToPurchase(item: PurchaseItem): Promise<string> {
    const now = new Date().toISOString();
    const id = item.id || generateGuid();
    const itemToSave: PurchaseItem = {
      ...item,
      id,
      addedDate: item.addedDate || now,
      lastModDate: now
    };
    await this.db.purchaseItems.put(itemToSave);
    await this.recalculatePurchaseTotal(item.purchaseId);
    return id;
  }

  async updateItem(item: PurchaseItem) {
    if (!item.id) return;
    const now = new Date().toISOString();
    item.totalPrice = item.quantity * item.unitPrice;
    item.lastModDate = now;
    await this.db.purchaseItems.put(item);
    await this.recalculatePurchaseTotal(item.purchaseId);
  }

  async toggleItemBought(item: PurchaseItem) {
    if (!item.id) return;
    const now = new Date().toISOString();
    item.isBought = !item.isBought;
    item.lastModDate = now;
    await this.db.purchaseItems.put(item);
    await this.recalculatePurchaseTotal(item.purchaseId);
  }

  async deleteItem(item: PurchaseItem) {
    if (!item.id) return;
    await this.db.purchaseItems.delete(item.id);
    await this.recalculatePurchaseTotal(item.purchaseId);
  }

  /** Recalculates total from bought items and persists it on the purchase. */
  async recalculatePurchaseTotal(purchaseId: string): Promise<number> {
    const items = await this.db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
    const total = items
      .filter(i => i.isBought)
      .reduce((sum, i) => sum + i.totalPrice, 0);
    const now = new Date().toISOString();
    await this.db.purchases.update(purchaseId, { totalPriceCalculated: total, lastModDate: now });
    return total;
  }

  // ─── Complete Purchase & Record Price History ───────────────────────────────

  async completePurchase(purchaseId: string) {
    const now = new Date().toISOString();
    const purchase = await this.db.purchases.get(purchaseId);
    if (!purchase) return;

    await this.db.purchases.update(purchaseId, {
      status: 'completed' as PurchaseStatus,
      lastModDate: now
    });

    // Inject bought items into price history
    const items = await this.db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
    const historyRecords: PriceHistory[] = items
      .filter(i => i.isBought && i.productId)
      .map(i => ({
        id: generateGuid(),
        productId: i.productId!,
        establishmentId: purchase.establishmentId,
        establishmentNameSnap: purchase.establishmentNameSnap,
        price: i.unitPrice,
        recordedDate: now,
        purchaseId,
        quantity: i.quantity
      }));

    if (historyRecords.length > 0) {
      await this.db.priceHistory.bulkPut(historyRecords);
    }
  }

  async cancelPurchase(purchaseId: string) {
    const now = new Date().toISOString();
    await this.db.purchases.update(purchaseId, { status: 'canceled' as PurchaseStatus, lastModDate: now });
  }

  async rollbackPurchase(purchaseId: string) {
    const now = new Date().toISOString();
    const purchase = await this.db.purchases.get(purchaseId);
    if (!purchase) return;

    await this.db.purchases.update(purchaseId, {
      status: 'active' as PurchaseStatus,
      purchaseDate: undefined,
      lastModDate: now
    });

    // Remove bought items from price history
    await this.db.priceHistory.where('purchaseId').equals(purchaseId).delete();
  }

  // ─── Analytics helpers ──────────────────────────────────────────────────────

  async getPriceEvolution(productId: string, establishmentId?: string): Promise<PriceHistory[]> {
    let records = await this.db.priceHistory.where('productId').equals(productId).sortBy('recordedDate');
    if (establishmentId !== undefined) {
      records = records.filter(r => r.establishmentId === establishmentId);
    }
    return records;
  }

  async compareStorePrices(productId: string): Promise<PriceHistory[]> {
    const records = await this.db.priceHistory.where('productId').equals(productId).toArray();
    const latestByStore: { [key: string]: PriceHistory } = {};
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
