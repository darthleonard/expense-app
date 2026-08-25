import { Injectable } from '@angular/core';
import {
  DatabaseService,
  ExpenseCategoryTag,
  toLower,
  generateGuid,
} from './database.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private db: DatabaseService) {}

  /**
   * Returns all expense categories sorted by name.
   */
  async getCategories(): Promise<ExpenseCategoryTag[]> {
    const list = await this.db.expenseCategories.toArray();
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Returns a Map of category ID to ExpenseCategoryTag for fast lookup.
   */
  async getCategoryMap(): Promise<Map<string, ExpenseCategoryTag>> {
    const list = await this.getCategories();
    const map = new Map<string, ExpenseCategoryTag>();
    for (const cat of list) {
      if (cat.id) {
        map.set(cat.id, cat);
      }
    }
    return map;
  }

  /**
   * Gets a single category by its ID.
   */
  async getCategoryById(id: string): Promise<ExpenseCategoryTag | undefined> {
    return this.db.expenseCategories.get(id);
  }

  /**
   * Saves a new or existing category. Enforces case-insensitive unique names.
   */
  async saveCategory(cat: Partial<ExpenseCategoryTag>): Promise<string> {
    if (!cat.name?.trim()) {
      throw new Error('CATEGORY_NAME_REQUIRED');
    }

    const now = new Date().toISOString();
    const normalizedName = toLower(cat.name);

    // Case-insensitive duplicate check
    const existing = await this.db.expenseCategories
      .filter((c) => toLower(c.name) === normalizedName)
      .first();

    if (existing && (!cat.id || existing.id !== cat.id)) {
      throw new Error('CATEGORY_NAME_DUPLICATE');
    }

    const id = cat.id || generateGuid();
    const recordToSave: ExpenseCategoryTag = {
      id,
      name: normalizedName,
      color: cat.color?.trim() || '#3880ff',
      creationDate: cat.creationDate || now,
      lastModDate: now,
    };

    await this.db.expenseCategories.put(recordToSave);
    return id;
  }

  /**
   * Checks if a category is referenced by any product, purchase item, or individual expense.
   */
  async isCategoryInUse(id: string): Promise<boolean> {
    const [prod, item, exp] = await Promise.all([
      this.db.products.filter((p) => p.categoryId === id).first(),
      this.db.purchaseItems.filter((i) => i.categoryId === id).first(),
      this.db.individualExpenses.filter((e) => e.categoryId === id).first(),
    ]);
    return !!(prod || item || exp);
  }

  /**
   * Deletes a category and cleanly unassigns it from all referencing records
   * (ProductCatalog, PurchaseItem, IndividualExpense) without deleting those records.
   */
  async deleteCategory(id: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db.transaction(
      'rw',
      [
        this.db.expenseCategories,
        this.db.products,
        this.db.purchaseItems,
        this.db.individualExpenses,
      ],
      async () => {
        // 1. Delete category tag
        await this.db.expenseCategories.delete(id);

        // 2. Clean up products referencing this category
        const affectedProducts = await this.db.products
          .filter((p) => p.categoryId === id)
          .toArray();
        for (const prod of affectedProducts) {
          prod.categoryId = undefined;
          prod.lastModDate = now;
          await this.db.products.put(prod);
        }

        // 3. Clean up purchase items referencing this category
        const affectedItems = await this.db.purchaseItems
          .filter((i) => i.categoryId === id)
          .toArray();
        for (const item of affectedItems) {
          item.categoryId = undefined;
          item.lastModDate = now;
          await this.db.purchaseItems.put(item);
        }

        // 4. Clean up individual expenses referencing this category
        const affectedExpenses = await this.db.individualExpenses
          .filter((e) => e.categoryId === id)
          .toArray();
        for (const exp of affectedExpenses) {
          exp.categoryId = undefined;
          exp.lastModDate = now;
          await this.db.individualExpenses.put(exp);
        }
      }
    );
  }
}
