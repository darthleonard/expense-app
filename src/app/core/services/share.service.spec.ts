import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';
import { DatabaseService, ExpenseRecord } from './database.service';
import { BluetoothTransferService } from './bluetooth-transfer.service';
import { SHARE_TABLES, SharePayload } from '../models/share-data.model';

describe('ShareService', () => {
  let service: ShareService;
  let db: DatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [ShareService, DatabaseService, BluetoothTransferService],
    });
    service = TestBed.inject(ShareService);
    db = TestBed.inject(DatabaseService);

    // Clean up shareable tables for isolated testing
    for (const table of SHARE_TABLES) {
      await (db as any)[table].clear();
    }
  });

  afterEach(async () => {
    for (const table of SHARE_TABLES) {
      await (db as any)[table].clear();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get data only from SHARE_TABLES', async () => {
    const expense: ExpenseRecord = {
      id: 1,
      type: 'housing',
      amount: 150,
      date: '2026-08-01',
      lastModDate: '2026-08-01T10:00:00Z',
    };
    await db.expenses.put(expense);

    const payload = await service.getDataToShare();
    expect(payload.app).toBe('Spendly');
    expect(payload.version).toBe(1);
    expect(payload.data.expenses?.length).toBe(1);
    expect(payload.data.expenses?.[0].amount).toBe(150);
  });

  it('should insert record when it does not exist on receiver', async () => {
    const payload: SharePayload = {
      app: 'Spendly',
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        expenses: [
          {
            id: 101,
            type: 'telecom',
            amount: 50,
            date: '2026-08-10',
            lastModDate: '2026-08-10T12:00:00Z',
          },
        ],
      },
    };

    const summary = await service.applyReceivedData(payload);
    expect(summary.totalReceived).toBe(1);
    expect(summary.totalInserted).toBe(1);
    expect(summary.totalUpdated).toBe(0);
    expect(summary.totalSkipped).toBe(0);

    const saved = await db.expenses.get(101);
    expect(saved).toBeDefined();
    expect(saved?.amount).toBe(50);
  });

  it('should update record when received record has newer lastModDate', async () => {
    // Local record
    await db.expenses.put({
      id: 201,
      type: 'water',
      amount: 40,
      date: '2026-08-01',
      lastModDate: '2026-08-01T10:00:00Z',
    });

    // Newer received record
    const payload: SharePayload = {
      app: 'Spendly',
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        expenses: [
          {
            id: 201,
            type: 'water',
            amount: 45, // updated amount
            date: '2026-08-01',
            lastModDate: '2026-08-05T10:00:00Z', // newer
          },
        ],
      },
    };

    const summary = await service.applyReceivedData(payload);
    expect(summary.totalReceived).toBe(1);
    expect(summary.totalInserted).toBe(0);
    expect(summary.totalUpdated).toBe(1);
    expect(summary.totalSkipped).toBe(0);

    const saved = await db.expenses.get(201);
    expect(saved?.amount).toBe(45);
  });

  it('should NOT modify record when local record is newer or equal', async () => {
    // Local newer record
    await db.expenses.put({
      id: 301,
      type: 'electricity',
      amount: 100,
      date: '2026-08-10',
      lastModDate: '2026-08-10T12:00:00Z',
    });

    // Older received record
    const payload: SharePayload = {
      app: 'Spendly',
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        expenses: [
          {
            id: 301,
            type: 'electricity',
            amount: 80,
            date: '2026-08-10',
            lastModDate: '2026-08-05T12:00:00Z', // older
          },
        ],
      },
    };

    const summary = await service.applyReceivedData(payload);
    expect(summary.totalReceived).toBe(1);
    expect(summary.totalInserted).toBe(0);
    expect(summary.totalUpdated).toBe(0);
    expect(summary.totalSkipped).toBe(1);

    const saved = await db.expenses.get(301);
    expect(saved?.amount).toBe(100); // untouched
  });

  it('should reject invalid payload format', async () => {
    await expectAsync(
      service.applyReceivedData({} as any)
    ).toBeRejectedWithError('INVALID_PAYLOAD_FORMAT');
  });
});
