import { Component, OnInit, inject } from '@angular/core';
import { DataIntegrityService, IntegrityIssue } from '../core/services/data-integrity.service';
import { DatabaseService } from '../core/services/database.service';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-database-analysis',
  templateUrl: './database-analysis.page.html',
  styleUrls: ['./database-analysis.page.scss'],
  standalone: false
})
export class DatabaseAnalysisPage implements OnInit {
  private integrityService = inject(DataIntegrityService);
  private db = inject(DatabaseService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private translate = inject(TranslateService);

  tables = [
    'cars',
    'houses',
    'expenses',
    'fuelRecords',
    'incomeRecords',
    'establishments',
    'products',
    'purchases',
    'purchaseItems',
    'priceHistory'
  ];

  scanResults: IntegrityIssue[] = [];
  groupedIssues: { [tableName: string]: IntegrityIssue[] } = {};
  tableStates: { [tableName: string]: boolean } = {};
  isLoading = false;

  // Modals state
  selectedIssue: IntegrityIssue | null = null;
  isDetailModalOpen = false;
  isEditModalOpen = false;

  // Edit form state
  editRecord: any = {};
  editFields: string[] = [];

  constructor() {
    // Initialize all tables as collapsed
    for (const table of this.tables) {
      this.tableStates[table] = false;
    }
  }

  ngOnInit() {
    void this.runScan();
  }

  async runScan() {
    this.isLoading = true;
    try {
      this.scanResults = await this.integrityService.scanDatabase();
      this.groupIssues();
    } catch (error) {
      console.error('Error during database integrity scan:', error);
      this.showToast(this.translate.instant('SCAN_FAILED'));
    } finally {
      this.isLoading = false;
    }
  }

  groupIssues() {
    // Reset grouped issues
    this.groupedIssues = {};
    for (const table of this.tables) {
      this.groupedIssues[table] = [];
    }

    // Populate issues
    for (const issue of this.scanResults) {
      if (!this.groupedIssues[issue.table]) {
        this.groupedIssues[issue.table] = [];
      }
      this.groupedIssues[issue.table].push(issue);
    }
  }

  toggleTable(table: string) {
    this.tableStates[table] = !this.tableStates[table];
  }

  getTableStatus(table: string): 'good' | 'warning' | 'error' {
    const count = this.groupedIssues[table]?.length ?? 0;
    if (count === 0) return 'good';
    
    // If any issue in the table cannot be autofixed or is an orphan, treat as error, otherwise warning
    const hasCritical = this.groupedIssues[table]?.some(i => i.issueType === 'orphan' || !i.canAutofix);
    return hasCritical ? 'error' : 'warning';
  }

  getTableIssuesCount(table: string): number {
    return this.groupedIssues[table]?.length ?? 0;
  }

  openDetail(issue: IntegrityIssue) {
    this.selectedIssue = issue;
    this.isDetailModalOpen = true;
  }

  closeDetail() {
    this.isDetailModalOpen = false;
    this.selectedIssue = null;
  }

  // Generic Edit Modal setup
  openEdit(issue: IntegrityIssue) {
    this.selectedIssue = issue;
    this.editRecord = { ...issue.record };
    
    // Find editable fields, skipping the 'id' field
    this.editFields = Object.keys(this.editRecord).filter(k => k !== 'id');
    this.isEditModalOpen = true;
  }

  closeEdit() {
    this.isEditModalOpen = false;
  }

  async saveEdit() {
    if (!this.selectedIssue) return;
    try {
      const table = this.db.table(this.selectedIssue.table);
      
      // Keep exact type alignment for number fields and boolean fields
      for (const field of this.editFields) {
        const val = this.editRecord[field];
        const origVal = this.selectedIssue.record[field];

        if (typeof origVal === 'number') {
          this.editRecord[field] = val !== '' && val !== null && val !== undefined ? Number(val) : undefined;
        } else if (typeof origVal === 'boolean') {
          this.editRecord[field] = val === true || val === 'true';
        }
      }

      await table.put(this.editRecord);
      this.isEditModalOpen = false;
      this.isDetailModalOpen = false;
      this.showToast(this.translate.instant('CHANGES_SAVED'));
      await this.runScan();
    } catch (err) {
      console.error('Error saving record edit:', err);
      this.showToast(this.translate.instant('SAVE_FAILED'));
    }
  }

  async deleteRecord(issue: IntegrityIssue) {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('DELETE'),
      message: this.translate.instant('DELETE_RECORD_CONFIRM'),
      buttons: [
        { text: this.translate.instant('CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('DELETE'),
          role: 'destructive',
          handler: async () => {
            const table = this.db.table(issue.table);
            await table.delete(issue.recordId);
            this.isDetailModalOpen = false;
            this.showToast(this.translate.instant('RECORD_DELETED'));
            await this.runScan();
          }
        }
      ]
    });
    await alert.present();
  }

  async autofixSingle(issue: IntegrityIssue) {
    try {
      await this.integrityService.autofixIssue(issue);
      this.isDetailModalOpen = false;
      this.showToast(this.translate.instant('ISSUE_RESOLVED'));
      await this.runScan();
    } catch (err) {
      console.error('Autofix error:', err);
      this.showToast(this.translate.instant('AUTOFIX_FAILED'));
    }
  }

  async autofixTable(tableName: string) {
    try {
      const tableIssues = this.groupedIssues[tableName] || [];
      let count = 0;
      for (const issue of tableIssues) {
        if (issue.canAutofix) {
          await this.integrityService.autofixIssue(issue);
          count++;
        }
      }
      this.showToast(this.translate.instant('RESOLVED_ISSUES_IN_TABLE', { count, table: tableName }));
      await this.runScan();
    } catch (err) {
      console.error('Autofix table error:', err);
      this.showToast(this.translate.instant('AUTOFIX_TABLE_FAILED'));
    }
  }

  async autofixAll() {
    try {
      let count = 0;
      for (const issue of this.scanResults) {
        if (issue.canAutofix) {
          await this.integrityService.autofixIssue(issue);
          count++;
        }
      }
      this.showToast(this.translate.instant('RESOLVED_ISSUES_DATABASE_WIDE', { count }));
      await this.runScan();
    } catch (err) {
      console.error('Autofix all error:', err);
      this.showToast(this.translate.instant('AUTOFIX_ALL_FAILED'));
    }
  }

  // Form Field Helpers
  isSelectField(field: string): boolean {
    const selects = ['type', 'period', 'category', 'status'];
    return selects.includes(field);
  }

  getSelectOptions(field: string): { label: string, value: string }[] {
    if (field === 'type') {
      return [
        { label: this.translate.instant('HOUSING_RENT_MORTGAGE'), value: 'casa' },
        { label: this.translate.instant('ELECTRICITY'), value: 'electricidad' },
        { label: this.translate.instant('WATER'), value: 'agua' },
        { label: this.translate.instant('GAS_BILL'), value: 'gas' },
        { label: this.translate.instant('TELECOMMUNICATIONS'), value: 'telecomunicaciones' }
      ];
    }
    if (field === 'period') {
      return [
        { label: this.translate.instant('MONTHLY'), value: 'mensual' },
        { label: this.translate.instant('FOURTEEN_DAY_CYCLE'), value: 'catorcenal' },
        { label: this.translate.instant('BI_WEEKLY_SHORT'), value: 'quincenal' }
      ];
    }
    if (field === 'category') {
      return [
        { label: this.translate.instant('CAT_FIXED'), value: 'gasto_fijo' },
        { label: this.translate.instant('CAT_VARIABLE'), value: 'gasto_variable' }
      ];
    }
    if (field === 'status') {
      return [
        { label: this.translate.instant('activa'), value: 'activa' },
        { label: this.translate.instant('completada'), value: 'completada' },
        { label: this.translate.instant('cancelada'), value: 'cancelada' }
      ];
    }
    return [];
  }

  isDateTimeField(field: string): boolean {
    return field === 'date' || field.endsWith('Date') || field === 'recordedDate' || field === 'purchaseDate';
  }

  isNumberField(field: string): boolean {
    const numbers = ['amount', 'odometer', 'unitPrice', 'totalPrice', 'liters', 'quantity', 'price', 'houseId', 'carId', 'establishmentId', 'purchaseId', 'productId'];
    return numbers.includes(field);
  }

  isBooleanField(field: string): boolean {
    return typeof this.selectedIssue?.record[field] === 'boolean';
  }

  isTextareaField(field: string): boolean {
    return field === 'notes' || field === 'description' || field === 'address';
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}
