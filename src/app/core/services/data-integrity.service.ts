import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseService } from './database.service';

export interface IntegrityIssue {
  id: string; // Unique identifier for the specific issue instance (e.g. "expenses_1_orphan_houseId")
  table: string;
  recordId: any;
  record: any;
  issueType: 'string_id' | 'string_fk' | 'orphan' | 'invalid_date' | 'invalid_value' | 'invalid_enum' | 'empty_name';
  titleKey: string;
  titleParams?: any;
  descriptionKey: string;
  descriptionParams?: any;
  title: string; // 3-4 words max
  description: string; // concise description
  field?: string;
  referencedTable?: string;
  canAutofix: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataIntegrityService {
  private db = inject(DatabaseService);
  private translate = inject(TranslateService);

  constructor() {}

  /**
   * Scans the database for integrity issues.
   */
  async scanDatabase(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Load all records from all tables
    const [
      cars,
      houses,
      expenses,
      fuelRecords,
      incomeRecords,
      establishments,
      products,
      purchases,
      purchaseItems,
      priceHistory,
      expenseCategories,
      individualExpenses
    ] = await Promise.all([
      this.db.cars.toArray(),
      this.db.houses.toArray(),
      this.db.expenses.toArray(),
      this.db.fuelRecords.toArray(),
      this.db.incomeRecords.toArray(),
      this.db.establishments.toArray(),
      this.db.products.toArray(),
      this.db.purchases.toArray(),
      this.db.purchaseItems.toArray(),
      this.db.priceHistory.toArray(),
      this.db.expenseCategories.toArray(),
      this.db.individualExpenses.toArray()
    ]);

    // Create maps of existing IDs for quick orphan checks
    const carIds = new Set(cars.map(c => c.id));
    const houseIds = new Set(houses.map(h => h.id));
    const establishmentIds = new Set(establishments.map(e => e.id));
    const productIds = new Set(products.map(p => p.id));
    const purchaseIds = new Set(purchases.map(p => p.id));
    const categoryIds = new Set(expenseCategories.map(c => c.id));

    // Helper: validate date string
    const isInvalidDate = (dStr: any): boolean => {
      if (!dStr) return true;
      const d = new Date(dStr);
      return isNaN(d.getTime());
    };

    // Helper: validate positive numeric value
    const isInvalidNumeric = (num: any, allowZero = false): boolean => {
      if (num === null || num === undefined) return true;
      const n = Number(num);
      if (isNaN(n)) return true;
      return allowZero ? n < 0 : n <= 0;
    };

    // Helper: Check basic ID issues (missing_id only — string GUIDs are correct)
    const checkId = (table: string, rec: any) => {
      if (rec.id === undefined || rec.id === null) {
        issues.push({
          id: `${table}_missing_id_${Math.random()}`,
          table,
          recordId: undefined,
          record: rec,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_MISSING_ID',
          descriptionKey: 'ISSUE_DESC_MISSING_ID',
          title: 'Missing record ID',
          description: 'This record does not have a primary key ID.',
          canAutofix: false
        });
      }
    };

    // 1. CARS
    for (const car of cars) {
      checkId('cars', car);
      if (!car.name?.trim()) {
        issues.push({
          id: `cars_${car.id}_empty_name`,
          table: 'cars',
          recordId: car.id,
          record: car,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty car name',
          description: 'The car must have a name.',
          field: 'name',
          canAutofix: true
        });
      }
    }

    // 2. HOUSES
    for (const house of houses) {
      checkId('houses', house);
      if (!house.name?.trim()) {
        issues.push({
          id: `houses_${house.id}_empty_name`,
          table: 'houses',
          recordId: house.id,
          record: house,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty house name',
          description: 'The house must have a name.',
          field: 'name',
          canAutofix: true
        });
      }
    }

    // 3. EXPENSES
    const validExpenseTypes = new Set(['housing', 'electricity', 'water', 'gas_bill', 'telecom']);
    for (const exp of expenses) {
      checkId('expenses', exp);
      
      // Foreign key check
      if (exp.houseId !== undefined && exp.houseId !== null) {
        if (!houseIds.has(exp.houseId)) {
          issues.push({
            id: `expenses_${exp.id}_orphan_houseId`,
            table: 'expenses',
            recordId: exp.id,
            record: exp,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: exp.houseId, table: 'houses' },
            title: 'Orphan house record',
            description: `References house ID ${exp.houseId} which does not exist.`,
            field: 'houseId',
            referencedTable: 'houses',
            canAutofix: true
          });
        }
      } else {
        issues.push({
          id: `expenses_${exp.id}_missing_houseId`,
          table: 'expenses',
          recordId: exp.id,
          record: exp,
          issueType: 'orphan',
          titleKey: 'ISSUE_TITLE_MISSING_FK',
          descriptionKey: 'ISSUE_DESC_MISSING_FK',
          descriptionParams: { field: 'houseId' },
          title: 'Missing house ID',
          description: 'Expense record has no associated house.',
          field: 'houseId',
          referencedTable: 'houses',
          canAutofix: true
        });
      }

      // Valid type check
      if (!validExpenseTypes.has(exp.type)) {
        issues.push({
          id: `expenses_${exp.id}_invalid_type`,
          table: 'expenses',
          recordId: exp.id,
          record: exp,
          issueType: 'invalid_enum',
          titleKey: 'ISSUE_TITLE_INVALID_TYPE',
          descriptionKey: 'ISSUE_DESC_INVALID_TYPE',
          descriptionParams: { value: exp.type },
          title: 'Invalid category type',
          description: `Category type '${exp.type}' is invalid.`,
          field: 'type',
          canAutofix: true
        });
      }

      // Valid amount
      if (isInvalidNumeric(exp.amount)) {
        issues.push({
          id: `expenses_${exp.id}_invalid_amount`,
          table: 'expenses',
          recordId: exp.id,
          record: exp,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_AMOUNT',
          descriptionKey: 'ISSUE_DESC_INVALID_AMOUNT',
          descriptionParams: { value: exp.amount },
          title: 'Invalid expense amount',
          description: `Amount is negative or zero (${exp.amount}).`,
          field: 'amount',
          canAutofix: true
        });
      }

      // Valid date
      if (isInvalidDate(exp.date)) {
        issues.push({
          id: `expenses_${exp.id}_invalid_date`,
          table: 'expenses',
          recordId: exp.id,
          record: exp,
          issueType: 'invalid_date',
          titleKey: 'ISSUE_TITLE_INVALID_DATE',
          descriptionKey: 'ISSUE_DESC_INVALID_DATE',
          descriptionParams: { value: exp.date },
          title: 'Invalid date format',
          description: `Date field is invalid ("${exp.date}").`,
          field: 'date',
          canAutofix: true
        });
      }
    }

    // 4. FUEL RECORDS
    for (const fuel of fuelRecords) {
      checkId('fuelRecords', fuel);

      // Foreign key check
      if (fuel.carId !== undefined && fuel.carId !== null) {
        if (!carIds.has(fuel.carId)) {
          issues.push({
            id: `fuelRecords_${fuel.id}_orphan_carId`,
            table: 'fuelRecords',
            recordId: fuel.id,
            record: fuel,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: fuel.carId, table: 'cars' },
            title: 'Orphan vehicle record',
            description: `References vehicle ID ${fuel.carId} which does not exist.`,
            field: 'carId',
            referencedTable: 'cars',
            canAutofix: true
          });
        }
      } else {
        issues.push({
          id: `fuelRecords_${fuel.id}_missing_carId`,
          table: 'fuelRecords',
          recordId: fuel.id,
          record: fuel,
          issueType: 'orphan',
          titleKey: 'ISSUE_TITLE_MISSING_FK',
          descriptionKey: 'ISSUE_DESC_MISSING_FK',
          descriptionParams: { field: 'carId' },
          title: 'Missing vehicle ID',
          description: 'Fuel record has no associated vehicle.',
          field: 'carId',
          referencedTable: 'cars',
          canAutofix: true
        });
      }

      // Valid values
      if (isInvalidNumeric(fuel.odometer)) {
        issues.push({
          id: `fuelRecords_${fuel.id}_invalid_odometer`,
          table: 'fuelRecords',
          recordId: fuel.id,
          record: fuel,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_VALUE',
          descriptionKey: 'ISSUE_DESC_INVALID_VALUE',
          descriptionParams: { field: 'odometer', value: fuel.odometer },
          title: 'Invalid odometer value',
          description: `Odometer reading is invalid (${fuel.odometer}).`,
          field: 'odometer',
          canAutofix: true
        });
      }
      if (isInvalidNumeric(fuel.liters)) {
        issues.push({
          id: `fuelRecords_${fuel.id}_invalid_liters`,
          table: 'fuelRecords',
          recordId: fuel.id,
          record: fuel,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_VALUE',
          descriptionKey: 'ISSUE_DESC_INVALID_VALUE',
          descriptionParams: { field: 'liters', value: fuel.liters },
          title: 'Invalid volume liters',
          description: `Fuel volume liters is invalid (${fuel.liters}).`,
          field: 'liters',
          canAutofix: true
        });
      }
      if (isInvalidNumeric(fuel.unitPrice)) {
        issues.push({
          id: `fuelRecords_${fuel.id}_invalid_unitPrice`,
          table: 'fuelRecords',
          recordId: fuel.id,
          record: fuel,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_VALUE',
          descriptionKey: 'ISSUE_DESC_INVALID_VALUE',
          descriptionParams: { field: 'unitPrice', value: fuel.unitPrice },
          title: 'Invalid unit price',
          description: `Unit price is invalid (${fuel.unitPrice}).`,
          field: 'unitPrice',
          canAutofix: true
        });
      }

      // Valid date
      if (isInvalidDate(fuel.date)) {
        issues.push({
          id: `fuelRecords_${fuel.id}_invalid_date`,
          table: 'fuelRecords',
          recordId: fuel.id,
          record: fuel,
          issueType: 'invalid_date',
          titleKey: 'ISSUE_TITLE_INVALID_DATE',
          descriptionKey: 'ISSUE_DESC_INVALID_DATE',
          descriptionParams: { value: fuel.date },
          title: 'Invalid date format',
          description: `Date field is invalid ("${fuel.date}").`,
          field: 'date',
          canAutofix: true
        });
      }
    }

    // 5. INCOME RECORDS
    const validIncomePeriods = new Set(['monthly', 'biweekly', 'semimonthly']);
    for (const inc of incomeRecords) {
      checkId('incomeRecords', inc);

      if (isInvalidNumeric(inc.amount)) {
        issues.push({
          id: `incomeRecords_${inc.id}_invalid_amount`,
          table: 'incomeRecords',
          recordId: inc.id,
          record: inc,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_AMOUNT',
          descriptionKey: 'ISSUE_DESC_INVALID_AMOUNT',
          descriptionParams: { value: inc.amount },
          title: 'Invalid income amount',
          description: `Income amount is invalid (${inc.amount}).`,
          field: 'amount',
          canAutofix: true
        });
      }

      if (!validIncomePeriods.has(inc.period)) {
        issues.push({
          id: `incomeRecords_${inc.id}_invalid_period`,
          table: 'incomeRecords',
          recordId: inc.id,
          record: inc,
          issueType: 'invalid_enum',
          titleKey: 'ISSUE_TITLE_INVALID_PERIOD',
          descriptionKey: 'ISSUE_DESC_INVALID_PERIOD',
          descriptionParams: { value: inc.period },
          title: 'Invalid income period',
          description: `Income period is invalid ("${inc.period}").`,
          field: 'period',
          canAutofix: true
        });
      }

      if (isInvalidDate(inc.date)) {
        issues.push({
          id: `incomeRecords_${inc.id}_invalid_date`,
          table: 'incomeRecords',
          recordId: inc.id,
          record: inc,
          issueType: 'invalid_date',
          titleKey: 'ISSUE_TITLE_INVALID_DATE',
          descriptionKey: 'ISSUE_DESC_INVALID_DATE',
          descriptionParams: { value: inc.date },
          title: 'Invalid date format',
          description: `Date field is invalid ("${inc.date}").`,
          field: 'date',
          canAutofix: true
        });
      }
    }

    // 6. ESTABLISHMENTS
    for (const est of establishments) {
      checkId('establishments', est);
      if (!est.name?.trim()) {
        issues.push({
          id: `establishments_${est.id}_empty_name`,
          table: 'establishments',
          recordId: est.id,
          record: est,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty store name',
          description: 'The store must have a name.',
          field: 'name',
          canAutofix: true
        });
      }
    }

    // 7. PRODUCTS
    const validProductCats = new Set(['fixed', 'variable']);
    for (const prod of products) {
      checkId('products', prod);
      if (!prod.name?.trim()) {
        issues.push({
          id: `products_${prod.id}_empty_name`,
          table: 'products',
          recordId: prod.id,
          record: prod,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty product name',
          description: 'The product must have a name.',
          field: 'name',
          canAutofix: true
        });
      }

      if (!validProductCats.has(prod.category)) {
        issues.push({
          id: `products_${prod.id}_invalid_category`,
          table: 'products',
          recordId: prod.id,
          record: prod,
          issueType: 'invalid_enum',
          titleKey: 'ISSUE_TITLE_INVALID_CATEGORY',
          descriptionKey: 'ISSUE_DESC_INVALID_CATEGORY',
          descriptionParams: { value: prod.category },
          title: 'Invalid product category',
          description: `Category '${prod.category}' is invalid.`,
          field: 'category',
          canAutofix: true
        });
      }

      if (prod.categoryId !== undefined && prod.categoryId !== null) {
        if (!categoryIds.has(prod.categoryId)) {
          issues.push({
            id: `products_${prod.id}_orphan_categoryId`,
            table: 'products',
            recordId: prod.id,
            record: prod,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: prod.categoryId, table: 'expenseCategories' },
            title: 'Orphan category record',
            description: `References category ID ${prod.categoryId} which does not exist.`,
            field: 'categoryId',
            referencedTable: 'expenseCategories',
            canAutofix: true
          });
        }
      }
    }

    // 8. PURCHASES
    const validPurchaseStatuses = new Set(['active', 'completed', 'canceled']);
    for (const purch of purchases) {
      checkId('purchases', purch);

      if (!purch.name?.trim()) {
        issues.push({
          id: `purchases_${purch.id}_empty_name`,
          table: 'purchases',
          recordId: purch.id,
          record: purch,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty purchase name',
          description: 'The purchase must have a name.',
          field: 'name',
          canAutofix: true
        });
      }

      if (!validPurchaseStatuses.has(purch.status)) {
        issues.push({
          id: `purchases_${purch.id}_invalid_status`,
          table: 'purchases',
          recordId: purch.id,
          record: purch,
          issueType: 'invalid_enum',
          titleKey: 'ISSUE_TITLE_INVALID_STATUS',
          descriptionKey: 'ISSUE_DESC_INVALID_STATUS',
          descriptionParams: { value: purch.status },
          title: 'Invalid purchase status',
          description: `Status '${purch.status}' is invalid.`,
          field: 'status',
          canAutofix: true
        });
      }

      // Foreign key
      if (purch.establishmentId !== undefined && purch.establishmentId !== null) {
        if (!establishmentIds.has(purch.establishmentId)) {
          issues.push({
            id: `purchases_${purch.id}_orphan_establishmentId`,
            table: 'purchases',
            recordId: purch.id,
            record: purch,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: purch.establishmentId, table: 'establishments' },
            title: 'Orphan store record',
            description: `References store ID ${purch.establishmentId} which does not exist.`,
            field: 'establishmentId',
            referencedTable: 'establishments',
            canAutofix: true
          });
        }
      }
    }

    // 9. PURCHASE ITEMS
    for (const item of purchaseItems) {
      checkId('purchaseItems', item);

      // Parent purchase
      if (item.purchaseId !== undefined && item.purchaseId !== null) {
        if (!purchaseIds.has(item.purchaseId)) {
          issues.push({
            id: `purchaseItems_${item.id}_orphan_purchaseId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: item.purchaseId, table: 'purchases' },
            title: 'Orphan purchase record',
            description: `References purchase ID ${item.purchaseId} which does not exist.`,
            field: 'purchaseId',
            referencedTable: 'purchases',
            canAutofix: true
          });
        }
      } else {
        issues.push({
          id: `purchaseItems_${item.id}_missing_purchaseId`,
          table: 'purchaseItems',
          recordId: item.id,
          record: item,
          issueType: 'orphan',
          titleKey: 'ISSUE_TITLE_MISSING_FK',
          descriptionKey: 'ISSUE_DESC_MISSING_FK',
          descriptionParams: { field: 'purchaseId' },
          title: 'Missing purchase ID',
          description: 'Purchase item has no associated purchase.',
          field: 'purchaseId',
          referencedTable: 'purchases',
          canAutofix: true
        });
      }

      // Optional Product
      if (item.productId !== undefined && item.productId !== null) {
        if (!productIds.has(item.productId)) {
          issues.push({
            id: `purchaseItems_${item.id}_orphan_productId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: item.productId, table: 'products' },
            title: 'Orphan product record',
            description: `References product ID ${item.productId} which does not exist.`,
            field: 'productId',
            referencedTable: 'products',
            canAutofix: true
          });
        }
      }

      // Optional Category
      if (item.categoryId !== undefined && item.categoryId !== null) {
        if (!categoryIds.has(item.categoryId)) {
          issues.push({
            id: `purchaseItems_${item.id}_orphan_categoryId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: item.categoryId, table: 'expenseCategories' },
            title: 'Orphan category record',
            description: `References category ID ${item.categoryId} which does not exist.`,
            field: 'categoryId',
            referencedTable: 'expenseCategories',
            canAutofix: true
          });
        }
      }

      // Valid metrics
      if (isInvalidNumeric(item.quantity)) {
        issues.push({
          id: `purchaseItems_${item.id}_invalid_quantity`,
          table: 'purchaseItems',
          recordId: item.id,
          record: item,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_VALUE',
          descriptionKey: 'ISSUE_DESC_INVALID_VALUE',
          descriptionParams: { field: 'quantity', value: item.quantity },
          title: 'Invalid quantity',
          description: `Quantity is invalid (${item.quantity}).`,
          field: 'quantity',
          canAutofix: true
        });
      }
      if (isInvalidNumeric(item.unitPrice, true)) {
        issues.push({
          id: `purchaseItems_${item.id}_invalid_unitPrice`,
          table: 'purchaseItems',
          recordId: item.id,
          record: item,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_VALUE',
          descriptionKey: 'ISSUE_DESC_INVALID_VALUE',
          descriptionParams: { field: 'unitPrice', value: item.unitPrice },
          title: 'Invalid unit price',
          description: `Unit price is invalid (${item.unitPrice}).`,
          field: 'unitPrice',
          canAutofix: true
        });
      }
    }

    // 10. PRICE HISTORY
    for (const hist of priceHistory) {
      checkId('priceHistory', hist);

      // Product relation
      if (hist.productId !== undefined && hist.productId !== null) {
        if (!productIds.has(hist.productId)) {
          issues.push({
            id: `priceHistory_${hist.id}_orphan_productId`,
            table: 'priceHistory',
            recordId: hist.id,
            record: hist,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: hist.productId, table: 'products' },
            title: 'Orphan product record',
            description: `References product ID ${hist.productId} which does not exist.`,
            field: 'productId',
            referencedTable: 'products',
            canAutofix: true
          });
        }
      } else {
        issues.push({
          id: `priceHistory_${hist.id}_missing_productId`,
          table: 'priceHistory',
          recordId: hist.id,
          record: hist,
          issueType: 'orphan',
          titleKey: 'ISSUE_TITLE_MISSING_FK',
          descriptionKey: 'ISSUE_DESC_MISSING_FK',
          descriptionParams: { field: 'productId' },
          title: 'Missing product ID',
          description: 'Price history record has no associated product.',
          field: 'productId',
          referencedTable: 'products',
          canAutofix: true
        });
      }

      // Optional Store relation
      if (hist.establishmentId !== undefined && hist.establishmentId !== null) {
        if (!establishmentIds.has(hist.establishmentId)) {
          issues.push({
            id: `priceHistory_${hist.id}_orphan_establishmentId`,
            table: 'priceHistory',
            recordId: hist.id,
            record: hist,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: hist.establishmentId, table: 'establishments' },
            title: 'Orphan store record',
            description: `References store ID ${hist.establishmentId} which does not exist.`,
            field: 'establishmentId',
            referencedTable: 'establishments',
            canAutofix: true
          });
        }
      }

      // Price metric
      if (isInvalidNumeric(hist.price, true)) {
        issues.push({
          id: `priceHistory_${hist.id}_invalid_price`,
          table: 'priceHistory',
          recordId: hist.id,
          record: hist,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_VALUE',
          descriptionKey: 'ISSUE_DESC_INVALID_VALUE',
          descriptionParams: { field: 'price', value: hist.price },
          title: 'Invalid price value',
          description: `Price is invalid (${hist.price}).`,
          field: 'price',
          canAutofix: true
        });
      }
    }

    // 11. EXPENSE CATEGORIES
    for (const cat of expenseCategories) {
      checkId('expenseCategories', cat);
      if (!cat.name?.trim()) {
        issues.push({
          id: `expenseCategories_${cat.id}_empty_name`,
          table: 'expenseCategories',
          recordId: cat.id,
          record: cat,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty category name',
          description: 'The category must have a name.',
          field: 'name',
          canAutofix: true
        });
      }
    }

    // 12. INDIVIDUAL EXPENSES
    const validExpenseCategories = new Set(['fixed', 'variable']);
    for (const exp of individualExpenses) {
      checkId('individualExpenses', exp);

      if (!exp.concept?.trim()) {
        issues.push({
          id: `individualExpenses_${exp.id}_empty_name`,
          table: 'individualExpenses',
          recordId: exp.id,
          record: exp,
          issueType: 'empty_name',
          titleKey: 'ISSUE_TITLE_EMPTY_NAME',
          descriptionKey: 'ISSUE_DESC_EMPTY_NAME',
          title: 'Empty concept',
          description: 'The expense must have a concept.',
          field: 'concept',
          canAutofix: true
        });
      }

      if (!validExpenseCategories.has(exp.category)) {
        issues.push({
          id: `individualExpenses_${exp.id}_invalid_category`,
          table: 'individualExpenses',
          recordId: exp.id,
          record: exp,
          issueType: 'invalid_enum',
          titleKey: 'ISSUE_TITLE_INVALID_CATEGORY',
          descriptionKey: 'ISSUE_DESC_INVALID_CATEGORY',
          descriptionParams: { value: exp.category },
          title: 'Invalid expense category',
          description: `Category '${exp.category}' is invalid.`,
          field: 'category',
          canAutofix: true
        });
      }

      if (exp.categoryId !== undefined && exp.categoryId !== null) {
        if (!categoryIds.has(exp.categoryId)) {
          issues.push({
            id: `individualExpenses_${exp.id}_orphan_categoryId`,
            table: 'individualExpenses',
            recordId: exp.id,
            record: exp,
            issueType: 'orphan',
            titleKey: 'ISSUE_TITLE_ORPHAN',
            descriptionKey: 'ISSUE_DESC_ORPHAN',
            descriptionParams: { id: exp.categoryId, table: 'expenseCategories' },
            title: 'Orphan category record',
            description: `References category ID ${exp.categoryId} which does not exist.`,
            field: 'categoryId',
            referencedTable: 'expenseCategories',
            canAutofix: true
          });
        }
      }

      if (isInvalidNumeric(exp.price)) {
        issues.push({
          id: `individualExpenses_${exp.id}_invalid_price`,
          table: 'individualExpenses',
          recordId: exp.id,
          record: exp,
          issueType: 'invalid_value',
          titleKey: 'ISSUE_TITLE_INVALID_AMOUNT',
          descriptionKey: 'ISSUE_DESC_INVALID_AMOUNT',
          descriptionParams: { value: exp.price },
          title: 'Invalid expense amount',
          description: `Amount is negative or zero (${exp.price}).`,
          field: 'price',
          canAutofix: true
        });
      }

      if (isInvalidDate(exp.date)) {
        issues.push({
          id: `individualExpenses_${exp.id}_invalid_date`,
          table: 'individualExpenses',
          recordId: exp.id,
          record: exp,
          issueType: 'invalid_date',
          titleKey: 'ISSUE_TITLE_INVALID_DATE',
          descriptionKey: 'ISSUE_DESC_INVALID_DATE',
          descriptionParams: { value: exp.date },
          title: 'Invalid date format',
          description: `Date field is invalid ("${exp.date}").`,
          field: 'date',
          canAutofix: true
        });
      }
    }

    // Populate translated title and description for each issue
    for (const issue of issues) {
      if (issue.titleKey) {
        issue.title = this.translate.instant(issue.titleKey, issue.titleParams);
      }
      if (issue.descriptionKey) {
        const params = { ...issue.descriptionParams };
        if (params.table) {
          params.table = this.translate.instant('TABLE_' + params.table);
        }
        issue.description = this.translate.instant(issue.descriptionKey, params);
      }
    }

    return issues;
  }

  /**
   * Automatically attempts to resolve a specific integrity issue.
   */
  async autofixIssue(issue: IntegrityIssue): Promise<void> {
    if (!issue.canAutofix) return;

    const table = this.db.table(issue.table);

    // 1. String primary key — no longer converted (GUIDs are the correct type)
    if (issue.issueType === 'string_id') {
      return; // Nothing to fix; string IDs are now correct
    }

    // Load current record state to ensure we are modifying the latest values
    const latestRecord = await table.get(issue.recordId);
    if (!latestRecord) return;

    const record = { ...latestRecord };

    // 2. String foreign key — no longer converted (GUIDs are the correct type)
    if (issue.issueType === 'string_fk' && issue.field) {
      return; // Nothing to fix; string FKs are now correct
    }

    // 3. Orphan relations resolution
    else if (issue.issueType === 'orphan' && issue.field) {
      if (issue.field === 'houseId') {
        const firstHouse = await this.db.houses.limit(1).first();
        if (firstHouse) {
          record.houseId = firstHouse.id;
        } else {
          const { generateGuid } = await import('./database.service');
          const newHouseId = generateGuid();
          await this.db.houses.put({ id: newHouseId, name: 'casa recuperada', icon: 'home' });
          record.houseId = newHouseId;
        }
      } else if (issue.field === 'carId') {
        const firstCar = await this.db.cars.limit(1).first();
        if (firstCar) {
          record.carId = firstCar.id;
        } else {
          const { generateGuid } = await import('./database.service');
          const newCarId = generateGuid();
          await this.db.cars.put({ id: newCarId, name: 'auto recuperado', icon: 'car' });
          record.carId = newCarId;
        }
      } else if (issue.field === 'purchaseId') {
        const firstPurchase = await this.db.purchases.limit(1).first();
        if (firstPurchase) {
          record.purchaseId = firstPurchase.id;
        } else {
          const { generateGuid } = await import('./database.service');
          const newPurchaseId = generateGuid();
          await this.db.purchases.put({
            id: newPurchaseId,
            name: 'compra recuperada',
            status: 'completed',
            creationDate: new Date().toISOString(),
            totalPriceCalculated: 0
          });
          record.purchaseId = newPurchaseId;
        }
      } else {
        // Optional foreign keys (establishmentId, productId, etc.) can be cleared safely
        record[issue.field] = undefined;
      }
    }

    // 4. Invalid dates resolution
    else if (issue.issueType === 'invalid_date' && issue.field) {
      const todayStr = new Date().toISOString();
      const backupDate = record.creationDate || record.addedDate || record.recordedDate || todayStr;
      record[issue.field] = backupDate.substring(0, 10);
    }

    // 5. Invalid values resolution (negative prices/amounts/liters/odometer)
    else if (issue.issueType === 'invalid_value' && issue.field) {
      const val = Number(record[issue.field]);
      record[issue.field] = isNaN(val) ? 1 : Math.abs(val) || 1;
    }

    // 6. Invalid enum values
    else if (issue.issueType === 'invalid_enum' && issue.field) {
      if (issue.field === 'type') record.type = 'housing';
      else if (issue.field === 'period') record.period = 'monthly';
      else if (issue.field === 'category') record.category = 'variable';
      else if (issue.field === 'status') record.status = 'active';
    }

    // 7. Empty name fields
    else if (issue.issueType === 'empty_name' && issue.field) {
      record[issue.field] = `Unnamed ${issue.table} #${record.id}`;
    }

    // Save updated record
    await table.put(record);
  }
}
