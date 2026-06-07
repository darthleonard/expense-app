import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import { DatabaseService, Purchase, Establishment, PurchaseType } from '../../core/services/database.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-purchases',
  templateUrl: './purchases.page.html',
  styleUrls: ['./purchases.page.scss'],
  standalone: false
})
export class PurchasesPage implements OnInit {
  purchases: Purchase[] = [];
  establishments: Establishment[] = [];

  // New purchase modal
  isModalOpen = false;
  newPurchase: Partial<Purchase> = {};

  constructor(
    private shopping: ShoppingService,
    private db: DatabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.purchases = await this.shopping.getPurchases();
    this.establishments = await this.shopping.getActiveEstablishments();
  }

  openNewPurchaseModal() {
    this.newPurchase = { type: 'planificada', status: 'activa', totalPriceCalculated: 0 };
    this.isModalOpen = true;
  }

  async savePurchase() {
    if (!this.newPurchase.name?.trim()) return;
    const est = this.establishments.find(e => e.id === this.newPurchase.establishmentId);
    const id = await this.shopping.savePurchase({
      name: this.newPurchase.name!,
      type: this.newPurchase.type as PurchaseType || 'planificada',
      status: 'activa',
      creationDate: new Date().toISOString(),
      establishmentId: this.newPurchase.establishmentId,
      establishmentNameSnap: est?.name,
      totalPriceCalculated: 0
    });
    this.isModalOpen = false;
    await this.loadData();
    this.router.navigate(['/shopping/purchase-detail', id]);
  }

  openDetail(purchase: Purchase) {
    this.router.navigate(['/shopping/purchase-detail', purchase.id]);
  }

  async confirmDelete(purchase: Purchase) {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('DELETE').toPromise(),
      message: purchase.name,
      buttons: [
        { text: await this.translate.get('CANCEL').toPromise(), role: 'cancel' },
        {
          text: await this.translate.get('DELETE').toPromise(),
          role: 'destructive',
          handler: async () => {
            await this.shopping.deletePurchase(purchase.id!);
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }

  getStatusColor(status: string): string {
    if (status === 'completada') return 'success';
    if (status === 'cancelada') return 'medium';
    return 'primary';
  }

  getTypeIcon(type: string): string {
    return type === 'individual' ? 'flash-outline' : 'list-outline';
  }
}
