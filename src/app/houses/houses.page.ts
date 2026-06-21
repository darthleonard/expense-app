import { Component, OnInit } from '@angular/core';
import { DatabaseService, House } from '../core/services/database.service';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-houses',
  templateUrl: './houses.page.html',
  styleUrls: ['./houses.page.scss'],
  standalone: false
})
export class HousesPage implements OnInit {
  houses: House[] = [];
  isModalOpen = false;
  editingHouse: House | null = null;
  currentHouse: House = this.getDefaultHouse();

  constructor(private db: DatabaseService,
    private alertCtrl: AlertController,
    private translate: TranslateService)
    { }

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.houses = await this.db.houses.toArray();
  }

  getDefaultHouse(): House {
    return { name: '', description: '', icon: 'home' };
  }

  openModal(house?: House) {
    if (house) {
      this.editingHouse = house;
      this.currentHouse = { ...house };
    } else {
      this.editingHouse = null;
      this.currentHouse = this.getDefaultHouse();
    }
    this.isModalOpen = true;
  }

  async saveHouse() {
    if (!this.currentHouse.name.trim()) return;
    
    if (this.editingHouse && this.editingHouse.id) {
      await this.db.houses.update(this.editingHouse.id, {
        ...this.currentHouse
      });
    } else {
      await this.db.houses.add({
        ...this.currentHouse
      });
    }
    this.isModalOpen = false;
    await this.loadData();
  }

  async deleteHouse(house: House) {
    if (!house.id) return;

    const expenses = await this.db.expenses.where('houseId').equals(house.id).toArray();
    if (expenses.length > 0) {
      this.confirmDelete(house);
      return;
    }

    await this.db.houses.delete(house.id);
    await this.loadData();
  }

  async confirmDelete(house: House) {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('DELETE'),
      message: this.translate.instant('HOUSE_HAS_EXPENSES'),
      buttons: [
        { text: this.translate.instant('CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.db.expenses.where('houseId').equals(house.id!).delete();
            await this.db.houses.delete(house.id!);
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }
}
