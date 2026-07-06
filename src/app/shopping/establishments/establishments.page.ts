import { Component, OnInit } from '@angular/core';
import { AlertController, IonModal } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import { DatabaseService, Establishment } from '../../core/services/database.service';
import { TranslateService } from '@ngx-translate/core';
import { HasChangesService } from '../../core/services/has-changes.service';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-establishments',
  templateUrl: './establishments.page.html',
  styleUrls: ['./establishments.page.scss'],
  standalone: false
})
export class EstablishmentsPage implements OnInit {
  establishments: Establishment[] = [];
  isModalOpen = false;
  editingEst: Establishment | null = null;
  current: Partial<Establishment> = {};

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private shopping: ShoppingService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private hasChangesService: HasChangesService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.establishments = await this.shopping.getEstablishments();
  }

  openModal(est?: Establishment) {
    if (est) {
      this.editingEst = est;
      this.current = { ...est };
    } else {
      this.editingEst = null;
      this.current = { isActive: true };
    }
    this.isModalOpen = true;
  }

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save') return true;
    
    const isChanged = this.hasChangesService.hasChanges(
      this.editingEst || { isActive: true },
      this.current
    );
    
    if (isChanged) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  };

  async save() {
    if (!this.current.name?.trim()) return;
    await this.shopping.saveEstablishment({
      name: this.current.name!.trim(),
      description: this.current.description,
      address: this.current.address,
      isActive: this.current.isActive ?? true,
      creationDate: this.editingEst?.creationDate || new Date().toISOString(),
      lastModDate: new Date().toISOString()
    });
    await this.modal.dismiss(null, 'save');
    await this.loadData();
  }

  async confirmDelete(est: Establishment) {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('DELETE').toPromise(),
      message: est.name.replace(/\b\w/g, c => c.toUpperCase()),
      buttons: [
        { text: await this.translate.get('CANCEL').toPromise(), role: 'cancel' },
        {
          text: await this.translate.get('DELETE').toPromise(),
          role: 'destructive',
          handler: async () => {
            await this.shopping.deleteEstablishment(est.id!);
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }
}
