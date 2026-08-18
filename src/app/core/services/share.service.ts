import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { BluetoothTransferService } from './bluetooth-transfer.service';
import {
  SHARE_TABLES,
  SharePayload,
  ShareTableName,
  TableTransferStats,
  TransferSummary,
} from '../models/share-data.model';

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  constructor(
    private db: DatabaseService,
    private bluetoothTransfer: BluetoothTransferService
  ) {}

  /**
   * Retrieves data strictly from the configured shareable tables.
   */
  async getDataToShare(): Promise<SharePayload> {
    const expenses = await this.db.expenses.toArray();
    const fuelRecords = await this.db.fuelRecords.toArray();
    const establishments = await this.db.establishments.toArray();
    const products = await this.db.products.toArray();
    const purchases = await this.db.purchases.toArray();
    const purchaseItems = await this.db.purchaseItems.toArray();
    const individualExpenses = await this.db.individualExpenses.toArray();

    return {
      app: 'Spendly',
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        expenses,
        fuelRecords,
        establishments,
        products,
        purchases,
        purchaseItems,
        individualExpenses,
      },
    };
  }

  /**
   * Safely and atomically applies received payload to the local database
   * using the lastModDate comparison rules inside a Dexie transaction.
   */
  async applyReceivedData(payload: SharePayload): Promise<TransferSummary> {
    if (!payload || payload.app !== 'Spendly' || !payload.data) {
      throw new Error('INVALID_PAYLOAD_FORMAT');
    }

    const tableMap: Record<ShareTableName, any> = {
      expenses: this.db.expenses,
      fuelRecords: this.db.fuelRecords,
      establishments: this.db.establishments,
      products: this.db.products,
      purchases: this.db.purchases,
      purchaseItems: this.db.purchaseItems,
      individualExpenses: this.db.individualExpenses,
    };

    const tablesToLock = SHARE_TABLES.map((name) => tableMap[name]);

    const summary: TransferSummary = {
      totalReceived: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      byTable: {},
      timestamp: new Date().toISOString(),
      senderDeviceName: payload.senderDeviceName,
    };

    // Execute atomic Dexie transaction across all shareable tables
    await this.db.transaction('rw', tablesToLock, async () => {
      for (const tableName of SHARE_TABLES) {
        const receivedRecords: any[] = payload.data[tableName] || [];
        const table = tableMap[tableName];

        const stats: TableTransferStats = {
          received: receivedRecords.length,
          inserted: 0,
          updated: 0,
          skipped: 0,
        };

        if (receivedRecords.length === 0) {
          summary.byTable[tableName] = stats;
          continue;
        }

        // Fetch all existing local records for this table
        const localRecords: any[] = await table.toArray();
        const localMap = new Map<number, any>();
        for (const r of localRecords) {
          if (r.id !== undefined) {
            localMap.set(r.id, r);
          }
        }

        for (const rec of receivedRecords) {
          const recId = rec.id;
          if (recId === undefined || !localMap.has(recId)) {
            // Record does not exist locally -> INSERT
            await table.put(rec);
            stats.inserted++;
          } else {
            // Record exists locally -> Compare lastModDate
            const localRec = localMap.get(recId);
            const receivedModTime = this.extractTimestamp(rec);
            const localModTime = this.extractTimestamp(localRec);

            if (receivedModTime > localModTime) {
              // Received record is strictly newer -> UPDATE
              await table.put(rec);
              stats.updated++;
            } else {
              // Local record is equal or newer -> DO NOT MODIFY
              stats.skipped++;
            }
          }
        }

        summary.byTable[tableName] = stats;
        summary.totalReceived += stats.received;
        summary.totalInserted += stats.inserted;
        summary.totalUpdated += stats.updated;
        summary.totalSkipped += stats.skipped;
      }
    });

    return summary;
  }

  /**
   * Helper to extract the most accurate timestamp from a record.
   * Prioritizes lastModDate, with fallbacks for legacy or newly created records.
   */
  private extractTimestamp(record: any): number {
    if (!record) return 0;
    const dateStr =
      record.lastModDate ||
      record.creationDate ||
      record.addedDate ||
      record.purchaseDate ||
      record.date;

    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    return isNaN(time) ? 0 : time;
  }

  /**
   * High-level send operation: prepares data and sends to receiver.
   */
  async send(targetAddress: string): Promise<{ success: boolean; bytesSent: number }> {
    const payload = await this.getDataToShare();
    return this.bluetoothTransfer.sendData(targetAddress, payload);
  }

  /**
   * High-level receive operation: waits for incoming payload and applies it.
   */
  async receiveAndApply(): Promise<TransferSummary> {
    const payload = await this.bluetoothTransfer.acceptTransfer();
    return this.applyReceivedData(payload);
  }
}
