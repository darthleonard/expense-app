import { Injectable } from '@angular/core';
import type {
  Car,
  House,
  ExpenseRecord,
  FuelRecord,
  IncomeRecord,
  Establishment,
  ProductCatalog,
  Purchase,
  PurchaseItem,
  PriceHistory,
} from './database.service';

@Injectable({ providedIn: 'root' })
export class SeedService {
  async seedMockData(db: any): Promise<void> {
    const now = new Date().toISOString();

    const houses: House[] = [
      {
        name: 'Casa principal',
        description: 'Residencia familiar',
        icon: 'home',
      },
      {
        name: 'Departamento',
        description: 'Departamento de trabajo',
        icon: 'business',
      },
    ];

    const cars: Car[] = [
      { name: 'Civic', description: 'Auto diario', icon: 'car' },
      { name: 'Yaris', description: 'Auto de ciudad', icon: 'car-sport' },
    ];

    const incomeRecords: IncomeRecord[] = [
      { amount: 3200000, period: 'mensual', date: '2026-06-01' },
      { amount: 1600000, period: 'quincenal', date: '2026-06-15' },
      { amount: 1500000, period: 'catorcenal', date: '2026-06-20' },
    ];

    const establishments: Establishment[] = [
      {
        name: 'supermercado la esquina',
        description: 'Mercado cercano',
        address: 'calle 10 # 20-30',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
      {
        name: 'farmacia del sol',
        description: 'Farmacia de barrio',
        address: 'avenida 5 # 15-25',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
      {
        name: 'ferretería central',
        description: 'Materiales para hogar',
        address: 'carrera 7 # 8-12',
        isActive: false,
        creationDate: now,
        lastModDate: now,
      },
    ];

    const products: ProductCatalog[] = [
      {
        name: 'arroz',
        description: 'arroz integral',
        category: 'gasto_fijo',
        subCategory: 'alimentos',
        code: 'AR-001',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
      {
        name: 'leche',
        description: 'leche entera',
        category: 'gasto_variable',
        subCategory: 'lacteos',
        code: 'LE-002',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
      {
        name: 'papel higiénico',
        description: 'rollos dobles',
        category: 'gasto_fijo',
        subCategory: 'higiene',
        code: 'PH-003',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
      {
        name: 'detergente',
        description: 'detergente líquido',
        category: 'gasto_variable',
        subCategory: 'limpieza',
        code: 'DE-004',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
      {
        name: 'shampoo',
        description: 'shampoo anticaspa',
        category: 'gasto_fijo',
        subCategory: 'belleza',
        code: 'SH-005',
        isActive: true,
        creationDate: now,
        lastModDate: now,
      },
    ];

    // Insert base entities and collect ids
    const houseIds = await Promise.all(houses.map((h) => db.houses.add(h)));
    const carIds = await Promise.all(cars.map((c) => db.cars.add(c)));

    // One year of monthly expenses for houseId 0
    const expenses: ExpenseRecord[] = Array.from(
      { length: 12 },
      (_, monthIndex): ExpenseRecord[] => {
        const date = new Date(Date.UTC(2026, monthIndex, 1))
          .toISOString()
          .slice(0, 10);
        const electricityAmount = 620 + ((monthIndex % 3) - 1) * 35;
        const waterAmount = 580 + ((monthIndex % 3) - 1) * 50;
        const gasAmount = 800 + ((monthIndex % 3) - 1) * 30;

        return [
          {
            houseId: houseIds[0],
            type: 'casa',
            amount: 9000,
            date,
            notes: 'mantenimiento mensual',
            creationDate: now,
            lastModDate: now,
          },
          {
            houseId: houseIds[0],
            type: 'electricidad',
            amount: electricityAmount,
            date,
            notes: 'consumo de luz',
            creationDate: now,
            lastModDate: now,
          },
          {
            houseId: houseIds[0],
            type: 'agua',
            amount: waterAmount,
            date,
            notes: 'servicio de agua',
            creationDate: now,
            lastModDate: now,
          },
          {
            houseId: houseIds[0],
            type: 'gas',
            amount: gasAmount,
            date,
            notes: 'gas domiciliario',
            creationDate: now,
            lastModDate: now,
          },
          {
            houseId: houseIds[0],
            type: 'telecomunicaciones',
            amount: 950,
            date,
            notes: 'internet y telefonía',
            creationDate: now,
            lastModDate: now,
          },
        ];
      },
    ).reduce((acc, v) => acc.concat(v), [] as ExpenseRecord[]);

    await db.expenses.bulkAdd(expenses);

    // Fuel records: only carId = first generated car id
    let previousOdometer = 120500;
    const fuelRecords: FuelRecord[] = Array.from({ length: 12 }, (_, index) => {
      const step = 380 + ((index * 31) % 101) - 50; // around 380 +/-50
      const odometer = previousOdometer + step;
      previousOdometer = odometer;

      const unitPrice = 4800 + ((index % 4) + 1) * 50;
      const liters = 16 + (index % 3) + (index % 2 === 0 ? 1 : 0);
      const date = new Date(Date.UTC(2026, index, 5))
        .toISOString()
        .slice(0, 10);

      return {
        carId: carIds[0],
        odometer,
        unitPrice,
        liters,
        totalPrice: unitPrice * liters,
        date,
        creationDate: now,
        lastModDate: now,
      };
    });

    await db.fuelRecords.bulkAdd(fuelRecords);

    await db.incomeRecords.bulkAdd(incomeRecords);

    const establishmentIds = await Promise.all(
      establishments.map((e) => db.establishments.add(e)),
    );
    const productIds = await Promise.all(
      products.map((p) => db.products.add(p)),
    );

    const purchasesData: Purchase[] = [
      {
        name: 'compra semanal',
        status: 'activa',
        creationDate: now,
        purchaseDate: '2026-06-18',
        notes: 'mercado semanal',
        establishmentId: establishmentIds[0],
        establishmentNameSnap: 'supermercado la esquina',
        totalPriceCalculated: 0,
      },
      {
        name: 'compras de hogar',
        status: 'completada',
        creationDate: now,
        purchaseDate: '2026-06-20',
        notes: 'productos para limpieza',
        establishmentId: establishmentIds[1],
        establishmentNameSnap: 'farmacia del sol',
        totalPriceCalculated: 0,
      },
    ];

    const purchaseIds = await Promise.all(
      purchasesData.map((p) => db.purchases.add(p)),
    );

    const purchaseItemsData: PurchaseItem[] = [
      {
        purchaseId: purchaseIds[0],
        productId: productIds[0],
        productNameSnap: 'arroz',
        categorySnap: 'gasto_fijo',
        quantity: 2,
        unitPrice: 2200,
        totalPrice: 4400,
        isBought: true,
        notes: 'paquete grande',
        addedDate: now,
      },
      {
        purchaseId: purchaseIds[0],
        productId: productIds[1],
        productNameSnap: 'leche',
        categorySnap: 'gasto_variable',
        quantity: 3,
        unitPrice: 3200,
        totalPrice: 9600,
        isBought: true,
        notes: 'tres unidades',
        addedDate: now,
      },
      {
        purchaseId: purchaseIds[1],
        productId: productIds[3],
        productNameSnap: 'detergente',
        categorySnap: 'gasto_variable',
        quantity: 1,
        unitPrice: 18500,
        totalPrice: 18500,
        isBought: true,
        notes: 'botella',
        addedDate: now,
      },
      {
        purchaseId: purchaseIds[1],
        productId: productIds[4],
        productNameSnap: 'shampoo',
        categorySnap: 'gasto_fijo',
        quantity: 2,
        unitPrice: 9500,
        totalPrice: 19000,
        isBought: true,
        notes: 'dos unidades',
        addedDate: now,
      },
    ];

    await db.purchaseItems.bulkAdd(purchaseItemsData);

    await db.purchases.update(purchaseIds[0], { totalPriceCalculated: 14000 });
    await db.purchases.update(purchaseIds[1], { totalPriceCalculated: 37500 });

    const priceHistoryData: PriceHistory[] = [
      {
        productId: productIds[0],
        establishmentId: establishmentIds[0],
        establishmentNameSnap: 'supermercado la esquina',
        price: 2200,
        recordedDate: now,
        purchaseId: purchaseIds[0],
        quantity: 2,
        notes: 'precio actual',
      },
      {
        productId: productIds[1],
        establishmentId: establishmentIds[0],
        establishmentNameSnap: 'supermercado la esquina',
        price: 3200,
        recordedDate: now,
        purchaseId: purchaseIds[0],
        quantity: 3,
        notes: 'precio actual',
      },
      {
        productId: productIds[3],
        establishmentId: establishmentIds[1],
        establishmentNameSnap: 'farmacia del sol',
        price: 18500,
        recordedDate: now,
        purchaseId: purchaseIds[1],
        quantity: 1,
        notes: 'precio actual',
      },
      {
        productId: productIds[4],
        establishmentId: establishmentIds[1],
        establishmentNameSnap: 'farmacia del sol',
        price: 9500,
        recordedDate: now,
        purchaseId: purchaseIds[1],
        quantity: 2,
        notes: 'precio actual',
      },
    ];

    await db.priceHistory.bulkAdd(priceHistoryData);
  }
}
