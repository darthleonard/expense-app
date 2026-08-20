import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '../../core/services/database.service';

@Component({
  selector: 'app-app-info',
  templateUrl: './app-info.page.html',
  styleUrls: ['./app-info.page.scss'],
  standalone: false,
})
export class AppInfoPage implements OnInit {
  appVersion = '1.2.0';
  dbVersion = 1;
  dbSizeFormatted = 'Loading...';
  tableCounts: { name: string; count: number }[] = [];

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    this.dbVersion = this.db.verno;
    await this.calculateDbSize();
  }

  async calculateDbSize() {
    try {
      let totalBytes = 0;
      const tables = this.db.tables;
      this.tableCounts = [];

      for (const table of tables) {
        const count = await table.count();
        this.tableCounts.push({ name: table.name, count });
        const records = await table.toArray();
        const jsonString = JSON.stringify(records);
        // Approximate byte size using UTF-8 length estimation
        totalBytes += new Blob([jsonString]).size;
      }

      // Check if navigator.storage.estimate API is available for IndexedDB storage size
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          // Use maximum of IndexedDB storage usage or serialized JSON size
          totalBytes = Math.max(totalBytes, estimate.usage);
        }
      }

      this.dbSizeFormatted = this.formatBytes(totalBytes);
    } catch (error) {
      console.error('Error calculating DB size:', error);
      this.dbSizeFormatted = 'N/A';
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
