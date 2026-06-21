import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import { DatabaseService, Purchase, Establishment } from '../../core/services/database.service';
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

  // New/edit purchase modal
  isModalOpen = false;
  editingPurchase: Purchase | null = null;
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
    this.editingPurchase = null;
    this.newPurchase = {
      status: 'activa',
      totalPriceCalculated: 0,
      purchaseDate: new Date().toISOString().substring(0, 10)
    };
    this.isModalOpen = true;
  }

  openEditModal(purchase: Purchase) {
    this.editingPurchase = purchase;
    this.newPurchase = {
      ...purchase,
      purchaseDate: purchase.purchaseDate ? purchase.purchaseDate.substring(0, 10) : purchase.creationDate.substring(0, 10)
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingPurchase = null;
  }

  async savePurchase() {
    if (!this.newPurchase.name?.trim()) return;
    const est = this.establishments.find(e => e.id === this.newPurchase.establishmentId);

    if (this.editingPurchase) {
      const updated: Purchase = {
        ...this.editingPurchase,
        name: this.newPurchase.name!.trim(),
        establishmentId: this.newPurchase.establishmentId,
        establishmentNameSnap: est?.name || undefined,
        purchaseDate: this.newPurchase.purchaseDate ? new Date(this.newPurchase.purchaseDate).toISOString() : undefined
      };
      await this.shopping.savePurchase(updated);
      this.closeModal();
      await this.loadData();
    } else {
      const id = await this.shopping.savePurchase({
        name: this.newPurchase.name!.trim(),
        status: 'activa',
        creationDate: new Date().toISOString(),
        purchaseDate: this.newPurchase.purchaseDate ? new Date(this.newPurchase.purchaseDate).toISOString() : new Date().toISOString(),
        establishmentId: this.newPurchase.establishmentId,
        establishmentNameSnap: est?.name,
        totalPriceCalculated: 0
      });
      this.closeModal();
      await this.loadData();
      this.router.navigate(['/shopping/purchase-detail', id]);
    }
  }

  openDetail(purchase: Purchase) {
    this.router.navigate(['/shopping/purchase-detail', purchase.id]);
  }

  async confirmDelete(purchase: Purchase) {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('DELETE').toPromise(),
      message: purchase.name.replace(/\b\w/g, c => c.toUpperCase()),
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
}
