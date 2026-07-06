import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class HasChangesService {
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);

  private activeConfirmPromise: Promise<boolean> | null = null;
  private isDiscarding = false;

  constructor() {}

  /**
   * Deep compares original and current objects to detect changes.
   * Strips undefined/null values for accurate comparison of form states.
   */
  hasChanges(original: any, current: any): boolean {
    const cleanOriginal = this.cleanObject(original);
    const cleanCurrent = this.cleanObject(current);
    return JSON.stringify(cleanOriginal) !== JSON.stringify(cleanCurrent);
  }

  /**
   * Shows an alert confirming if the user wants to discard unsaved changes.
   * Resolves to true if they choose "Discard", or false if "Keep Editing".
   */
  async confirmDiscard(): Promise<boolean> {
    if (this.isDiscarding) {
      return true;
    }

    if (this.activeConfirmPromise) {
      return this.activeConfirmPromise;
    }

    this.activeConfirmPromise = new Promise<boolean>(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('UNSAVED_CHANGES'),
        message: this.translate.instant('DISCARD_CHANGES_CONFIRM'),
        buttons: [
          {
            text: this.translate.instant('KEEP_EDITING'),
            role: 'cancel',
            handler: () => {
              this.activeConfirmPromise = null;
              resolve(false);
            }
          },
          {
            text: this.translate.instant('DISCARD'),
            role: 'destructive',
            handler: () => {
              this.activeConfirmPromise = null;
              this.isDiscarding = true;
              setTimeout(() => {
                this.isDiscarding = false;
              }, 1000);
              resolve(true);
            }
          }
        ]
      });
      await alert.present();
    });

    return this.activeConfirmPromise;
  }

  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.cleanObject(item));

    const cleaned: any = {};
    Object.keys(obj).sort().forEach(key => {
      const val = obj[key];
      // Ignore null, undefined, and empty strings for form comparisons
      if (val !== null && val !== undefined && val !== '') {
        cleaned[key] = this.cleanObject(val);
      }
    });
    return cleaned;
  }
}
