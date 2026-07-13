import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';

export interface IntegrityIssue {
  id: string; // Unique identifier for the specific issue instance (e.g. "expenses_1_orphan_houseId")
  table: string;
  recordId: any;
  record: any;
  issueType: 'string_id' | 'string_fk' | 'orphan' | 'invalid_date' | 'invalid_value' | 'invalid_enum' | 'empty_name';
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
      priceHistory
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
      this.db.priceHistory.toArray()
    ]);

    // Create maps of existing IDs for quick orphan checks
    const carIds = new Set(cars.map(c => c.id));
    const houseIds = new Set(houses.map(h => h.id));
    const establishmentIds = new Set(establishments.map(e => e.id));
    const productIds = new Set(products.map(p => p.id));
    const purchaseIds = new Set(purchases.map(p => p.id));

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

    // Helper: Check basic ID issues (string_id / missing_id)
    const checkId = (table: string, rec: any) => {
      if (rec.id === undefined || rec.id === null) {
        issues.push({
          id: `${table}_missing_id_${Math.random()}`,
          table,
          recordId: undefined,
          record: rec,
          issueType: 'invalid_value',
          title: 'Missing record ID',
          description: 'This record does not have a primary key ID.',
          canAutofix: false
        });
      } else if (typeof rec.id === 'string') {
        issues.push({
          id: `${table}_${rec.id}_string_id`,
          table,
          recordId: rec.id,
          record: rec,
          issueType: 'string_id',
          title: 'String primary key',
          description: `Primary key 'id' is a string ("${rec.id}") instead of a number.`,
          canAutofix: true
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
          title: 'Empty house name',
          description: 'The house must have a name.',
          field: 'name',
          canAutofix: true
        });
      }
    }

    // 3. EXPENSES
    const validExpenseTypes = new Set(['casa', 'electricidad', 'agua', 'gas', 'telecomunicaciones']);
    for (const exp of expenses) {
      checkId('expenses', exp);
      
      // Foreign key type check
      if (exp.houseId !== undefined && exp.houseId !== null) {
        if (typeof exp.houseId === 'string') {
          issues.push({
            id: `expenses_${exp.id}_string_fk_houseId`,
            table: 'expenses',
            recordId: exp.id,
            record: exp,
            issueType: 'string_fk',
            title: 'String house ID',
            description: `Foreign key 'houseId' is a string ("${exp.houseId}") instead of a number.`,
            field: 'houseId',
            canAutofix: true
          });
        } else if (!houseIds.has(Number(exp.houseId))) {
          issues.push({
            id: `expenses_${exp.id}_orphan_houseId`,
            table: 'expenses',
            recordId: exp.id,
            record: exp,
            issueType: 'orphan',
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
        if (typeof fuel.carId === 'string') {
          issues.push({
            id: `fuelRecords_${fuel.id}_string_fk_carId`,
            table: 'fuelRecords',
            recordId: fuel.id,
            record: fuel,
            issueType: 'string_fk',
            title: 'String vehicle ID',
            description: `Foreign key 'carId' is a string ("${fuel.carId}") instead of a number.`,
            field: 'carId',
            canAutofix: true
          });
        } else if (!carIds.has(Number(fuel.carId))) {
          issues.push({
            id: `fuelRecords_${fuel.id}_orphan_carId`,
            table: 'fuelRecords',
            recordId: fuel.id,
            record: fuel,
            issueType: 'orphan',
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
          title: 'Invalid date format',
          description: `Date field is invalid ("${fuel.date}").`,
          field: 'date',
          canAutofix: true
        });
      }
    }

    // 5. INCOME RECORDS
    const validIncomePeriods = new Set(['mensual', 'catorcenal', 'quincenal']);
    for (const inc of incomeRecords) {
      checkId('incomeRecords', inc);

      if (isInvalidNumeric(inc.amount)) {
        issues.push({
          id: `incomeRecords_${inc.id}_invalid_amount`,
          table: 'incomeRecords',
          recordId: inc.id,
          record: inc,
          issueType: 'invalid_value',
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
          title: 'Empty store name',
          description: 'The store must have a name.',
          field: 'name',
          canAutofix: true
        });
      }
    }

    // 7. PRODUCTS
    const validProductCats = new Set(['gasto_fijo', 'gasto_variable']);
    for (const prod of products) {
      checkId('products', prod);
      if (!prod.name?.trim()) {
        issues.push({
          id: `products_${prod.id}_empty_name`,
          table: 'products',
          recordId: prod.id,
          record: prod,
          issueType: 'empty_name',
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
          title: 'Invalid product category',
          description: `Category '${prod.category}' is invalid.`,
          field: 'category',
          canAutofix: true
        });
      }
    }

    // 8. PURCHASES
    const validPurchaseStatuses = new Set(['activa', 'completada', 'cancelada']);
    for (const purch of purchases) {
      checkId('purchases', purch);

      if (!purch.name?.trim()) {
        issues.push({
          id: `purchases_${purch.id}_empty_name`,
          table: 'purchases',
          recordId: purch.id,
          record: purch,
          issueType: 'empty_name',
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
          title: 'Invalid purchase status',
          description: `Status '${purch.status}' is invalid.`,
          field: 'status',
          canAutofix: true
        });
      }

      // Foreign key
      if (purch.establishmentId !== undefined && purch.establishmentId !== null) {
        if (typeof purch.establishmentId === 'string') {
          issues.push({
            id: `purchases_${purch.id}_string_fk_establishmentId`,
            table: 'purchases',
            recordId: purch.id,
            record: purch,
            issueType: 'string_fk',
            title: 'String store ID',
            description: `Foreign key 'establishmentId' is a string ("${purch.establishmentId}") instead of a number.`,
            field: 'establishmentId',
            canAutofix: true
          });
        } else if (!establishmentIds.has(Number(purch.establishmentId))) {
          issues.push({
            id: `purchases_${purch.id}_orphan_establishmentId`,
            table: 'purchases',
            recordId: purch.id,
            record: purch,
            issueType: 'orphan',
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
        if (typeof item.purchaseId === 'string') {
          issues.push({
            id: `purchaseItems_${item.id}_string_fk_purchaseId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'string_fk',
            title: 'String purchase ID',
            description: `Foreign key 'purchaseId' is a string ("${item.purchaseId}") instead of a number.`,
            field: 'purchaseId',
            canAutofix: true
          });
        } else if (!purchaseIds.has(Number(item.purchaseId))) {
          issues.push({
            id: `purchaseItems_${item.id}_orphan_purchaseId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'orphan',
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
          title: 'Missing purchase ID',
          description: 'Purchase item has no associated purchase.',
          field: 'purchaseId',
          referencedTable: 'purchases',
          canAutofix: true
        });
      }

      // Optional Product
      if (item.productId !== undefined && item.productId !== null) {
        if (typeof item.productId === 'string') {
          issues.push({
            id: `purchaseItems_${item.id}_string_fk_productId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'string_fk',
            title: 'String product ID',
            description: `Foreign key 'productId' is a string ("${item.productId}") instead of a number.`,
            field: 'productId',
            canAutofix: true
          });
        } else if (!productIds.has(Number(item.productId))) {
          issues.push({
            id: `purchaseItems_${item.id}_orphan_productId`,
            table: 'purchaseItems',
            recordId: item.id,
            record: item,
            issueType: 'orphan',
            title: 'Orphan product record',
            description: `References product ID ${item.productId} which does not exist.`,
            field: 'productId',
            referencedTable: 'products',
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
        if (typeof hist.productId === 'string') {
          issues.push({
            id: `priceHistory_${hist.id}_string_fk_productId`,
            table: 'priceHistory',
            recordId: hist.id,
            record: hist,
            issueType: 'string_fk',
            title: 'String product ID',
            description: `Foreign key 'productId' is a string ("${hist.productId}") instead of a number.`,
            field: 'productId',
            canAutofix: true
          });
        } else if (!productIds.has(Number(hist.productId))) {
          issues.push({
            id: `priceHistory_${hist.id}_orphan_productId`,
            table: 'priceHistory',
            recordId: hist.id,
            record: hist,
            issueType: 'orphan',
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
          title: 'Missing product ID',
          description: 'Price history record has no associated product.',
          field: 'productId',
          referencedTable: 'products',
          canAutofix: true
        });
      }

      // Optional Store relation
      if (hist.establishmentId !== undefined && hist.establishmentId !== null) {
        if (typeof hist.establishmentId === 'string') {
          issues.push({
            id: `priceHistory_${hist.id}_string_fk_establishmentId`,
            table: 'priceHistory',
            recordId: hist.id,
            record: hist,
            issueType: 'string_fk',
            title: 'String store ID',
            description: `Foreign key 'establishmentId' is a string ("${hist.establishmentId}") instead of a number.`,
            field: 'establishmentId',
            canAutofix: true
          });
        } else if (!establishmentIds.has(Number(hist.establishmentId))) {
          issues.push({
            id: `priceHistory_${hist.id}_orphan_establishmentId`,
            table: 'priceHistory',
            recordId: hist.id,
            record: hist,
            issueType: 'orphan',
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
          title: 'Invalid price value',
          description: `Price is invalid (${hist.price}).`,
          field: 'price',
          canAutofix: true
        });
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

    // 1. String primary key conversion
    if (issue.issueType === 'string_id') {
      const oldId = issue.recordId;
      const newId = Number(oldId);
      if (!isNaN(newId)) {
        const record = { ...issue.record, id: newId };
        await this.db.transaction('rw', [table], async () => {
          await table.delete(oldId);
          await table.put(record);
        });
      }
      return;
    }

    // Load current record state to ensure we are modifying the latest values
    const latestRecord = await table.get(issue.recordId);
    if (!latestRecord) return;

    const record = { ...latestRecord };

    // 2. String foreign key conversion
    if (issue.issueType === 'string_fk' && issue.field) {
      const val = Number(record[issue.field]);
      record[issue.field] = isNaN(val) ? undefined : val;
    }

    // 3. Orphan relations resolution
    else if (issue.issueType === 'orphan' && issue.field) {
      if (issue.field === 'houseId') {
        const firstHouse = await this.db.houses.limit(1).first();
        if (firstHouse) {
          record.houseId = firstHouse.id;
        } else {
          const newHouseId = await this.db.houses.add({ name: 'casa recuperada', icon: 'home' });
          record.houseId = newHouseId;
        }
      } else if (issue.field === 'carId') {
        const firstCar = await this.db.cars.limit(1).first();
        if (firstCar) {
          record.carId = firstCar.id;
        } else {
          const newCarId = await this.db.cars.add({ name: 'auto recuperado', icon: 'car' });
          record.carId = newCarId;
        }
      } else if (issue.field === 'purchaseId') {
        const firstPurchase = await this.db.purchases.limit(1).first();
        if (firstPurchase) {
          record.purchaseId = firstPurchase.id;
        } else {
          const newPurchaseId = await this.db.purchases.add({
            name: 'compra recuperada',
            status: 'completada',
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
      if (issue.field === 'type') record.type = 'casa';
      else if (issue.field === 'period') record.period = 'mensual';
      else if (issue.field === 'category') record.category = 'gasto_variable';
      else if (issue.field === 'status') record.status = 'activa';
    }

    // 7. Empty name fields
    else if (issue.issueType === 'empty_name' && issue.field) {
      record[issue.field] = `Unnamed ${issue.table} #${record.id}`;
    }

    // Save updated record
    await table.put(record);
  }
}
