import { Component, ElementRef, ViewChild } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { CsvBackupService } from '../core/services/csv-backup.service';

@Component({
  selector: 'app-data-backup',
  templateUrl: './data-backup.page.html',
  styleUrls: ['./data-backup.page.scss'],
  standalone: false
})
export class DataBackupPage {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isExporting = false;
  isImporting = false;

  constructor(
    private backup: CsvBackupService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {}

  // ── Export ──────────────────────────────────────────────────────────────────

  async onExport() {
    this.isExporting = true;
    try {
      await this.backup.exportAll();
      await this.showToast('EXPORT_SUCCESS', 'success');
    } catch (err) {
      console.error(err);
      await this.showToast('BACKUP_ERROR', 'danger');
    } finally {
      this.isExporting = false;
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async onImport() {
    const confirmed = await this.confirmImport();
    if (!confirmed) return;

    // On Android/native: trigger the hidden file input (Capacitor WebView supports it)
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting = true;
    try {
      await this.backup.importAll(file);
      await this.showToast('IMPORT_SUCCESS', 'success');
    } catch (err) {
      console.error(err);
      await this.showToast('BACKUP_ERROR', 'danger');
    } finally {
      this.isImporting = false;
      // Reset so the same file can be picked again
      input.value = '';
    }
  }

  private async confirmImport(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const warning = await this.translate.get('IMPORT_WARNING').toPromise();
      const cancelLabel = await this.translate.get('CANCEL').toPromise();
      const confirmLabel = await this.translate.get('CONFIRM').toPromise();

      const alert = await this.alertCtrl.create({
        header: await this.translate.get('IMPORT_TITLE').toPromise(),
        message: warning,
        buttons: [
          { text: cancelLabel, role: 'cancel', handler: () => resolve(false) },
          { text: confirmLabel, role: 'destructive', handler: () => resolve(true) }
        ]
      });
      await alert.present();
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async showToast(key: string, color: 'success' | 'danger') {
    const message = await this.translate.get(key).toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 'alert-circle'
    });
    await toast.present();
  }
}
