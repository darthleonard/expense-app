import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { AlertController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { strFromU8, strToU8, zip, unzip, Zippable } from 'fflate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportBundle {
  expenses: any[];
  fuelRecords: any[];
  cars: any[];
  houses: any[];
  incomeRecords: any[];
  establishments: any[];
  products: any[];
  purchases: any[];
  purchaseItems: any[];
  priceHistory: any[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CsvBackupService {

  constructor(
    private db: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  // ── CSV helpers ─────────────────────────────────────────────────────────────

  private toCsv(rows: any[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: any): string => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      // Quote fields that contain commas, quotes, or newlines
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(','))
    ];
    return lines.join('\n');
  }

  private parseCsv(csv: string): any[] {
    if (!csv.trim()) return [];
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = this.parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = this.parseCsvLine(line);
      const obj: any = {};
      headers.forEach((h, i) => {
        const v = values[i] ?? '';
        // Auto-cast numeric strings (but not empty strings or date strings)
        if (v !== '' && !isNaN(Number(v)) && !String(v).includes('-') && h !== 'id') {
          obj[h] = Number(v);
        } else if (v === 'true') {
          obj[h] = true;
        } else if (v === 'false') {
          obj[h] = false;
        } else {
          obj[h] = v === '' ? undefined : v;
        }
      });
      return obj;
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  async exportAll(): Promise<void> {
    try {
      const bundle: ExportBundle = {
        expenses:      await this.db.expenses.toArray(),
        fuelRecords:   await this.db.fuelRecords.toArray(),
        cars:          await this.db.cars.toArray(),
        houses:        await this.db.houses.toArray(),
        incomeRecords: await this.db.incomeRecords.toArray(),
        establishments: await this.db.establishments.toArray(),
        products:      await this.db.products.toArray(),
        purchases:     await this.db.purchases.toArray(),
        purchaseItems: await this.db.purchaseItems.toArray(),
        priceHistory:  await this.db.priceHistory.toArray()
      };

      const files: Zippable = {};
      for (const [tableName, rows] of Object.entries(bundle)) {
        const csv = this.toCsv(rows);
        files[`${tableName}.csv`] = strToU8(csv);
      }

      // Build zip
      const zipBuffer = await new Promise<Uint8Array>((resolve, reject) => {
        zip(files, {}, (err, data) => {
          if (err) reject(err); else resolve(data);
        });
      });

      const fileName = `expense_backup_${this.dateStamp()}.zip`;

      if (Capacitor.isNativePlatform()) {
        await this.shareOnNative(zipBuffer, fileName);
      } else {
        this.downloadOnBrowser(zipBuffer, fileName);
      }

    } catch (err) {
      console.error('[CsvBackup] Export error:', err);
      throw err;
    }
  }

  private async shareOnNative(buffer: Uint8Array, fileName: string): Promise<void> {
    // Dynamic imports to avoid breaking desktop build where plugins aren't available
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = this.uint8ToBase64(buffer);

    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache
    });

    await Share.share({
      title: 'Expense App Backup',
      text: 'Backup file from Expense App',
      url: uri,
      dialogTitle: 'Share your backup'
    });
  }

  private downloadOnBrowser(buffer: Uint8Array, fileName: string): void {
    // Copy to a plain ArrayBuffer to satisfy strict TypeScript Blob typing
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const blob = new Blob([ab], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async importAll(file: File | Blob): Promise<void> {
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    const files = await new Promise<{ [name: string]: Uint8Array }>((resolve, reject) => {
      unzip(uint8, (err, data) => {
        if (err) reject(err); else resolve(data as { [name: string]: Uint8Array });
      });
    });

    const getTable = (name: string): any[] => {
      const entry = files[`${name}.csv`];
      if (!entry) return [];
      return this.parseCsv(strFromU8(entry));
    };

    // Strip IDs so Dexie auto-assigns new ones (preserving referential integrity
    // is handled by the snapshot fields already stored in the rows)
    const stripId = (rows: any[]) => rows.map(({ id, ...rest }) => rest);

    const tables = [
      this.db.expenses, this.db.fuelRecords, this.db.cars, this.db.houses,
      this.db.incomeRecords, this.db.establishments, this.db.products,
      this.db.purchases, this.db.purchaseItems, this.db.priceHistory
    ];

    await this.db.transaction('rw', tables, async () => {
      await this.db.expenses.clear();
      await this.db.fuelRecords.clear();
      await this.db.cars.clear();
      await this.db.houses.clear();
      await this.db.incomeRecords.clear();
      await this.db.establishments.clear();
      await this.db.products.clear();
      await this.db.purchases.clear();
      await this.db.purchaseItems.clear();
      await this.db.priceHistory.clear();

      const expenses       = getTable('expenses');
      const fuelRecords    = getTable('fuelRecords');
      const cars           = getTable('cars');
      const houses         = getTable('houses');
      const incomeRecords  = getTable('incomeRecords');
      const establishments = getTable('establishments');
      const products       = getTable('products');
      const purchases      = getTable('purchases');
      const purchaseItems  = getTable('purchaseItems');
      const priceHistory   = getTable('priceHistory');

      if (expenses.length)       await this.db.expenses.bulkAdd(expenses);
      if (fuelRecords.length)    await this.db.fuelRecords.bulkAdd(fuelRecords);
      if (cars.length)           await this.db.cars.bulkAdd(cars);
      if (houses.length)         await this.db.houses.bulkAdd(houses);
      if (incomeRecords.length)  await this.db.incomeRecords.bulkAdd(incomeRecords);
      if (establishments.length) await this.db.establishments.bulkAdd(establishments);
      if (products.length)       await this.db.products.bulkAdd(products);
      if (purchases.length)      await this.db.purchases.bulkAdd(purchases);
      if (purchaseItems.length)  await this.db.purchaseItems.bulkAdd(purchaseItems);
      if (priceHistory.length)   await this.db.priceHistory.bulkAdd(priceHistory);
    });
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private dateStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
}
