import { Component, OnInit } from '@angular/core';
import { DatabaseService, House, toLower, generateGuid } from '../core/services/database.service';
import { AlertController, IonModal } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HasChangesService } from '../core/services/has-changes.service';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-houses',
  templateUrl: './houses.page.html',
  styleUrls: ['./houses.page.scss'],
  standalone: false
})
export class HousesPage implements OnInit {
  houses: House[] = [];
  isModalOpen = false;
  isSaving = false;
  editingHouse: House | null = null;
  currentHouse: House = this.getDefaultHouse();

  @ViewChild(IonModal) modal!: IonModal;
  
  constructor(private db: DatabaseService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private hasChangesService: HasChangesService)
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
    this.isSaving = false;
    if (house) {
      this.editingHouse = house;
      this.currentHouse = { ...house };
    } else {
      this.editingHouse = null;
      this.currentHouse = this.getDefaultHouse();
    }
    this.isModalOpen = true;
  }

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save' || this.isSaving) return true;
    
    const isChanged = this.hasChangesService.hasChanges(
      this.editingHouse || this.getDefaultHouse(),
      this.currentHouse
    );
    
    if (isChanged) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  };

  async saveHouse() {
    if (!this.currentHouse.name.trim()) return;
    
    this.isSaving = true;
    try {
      const id = this.editingHouse?.id || generateGuid();
      const houseToSave: House = {
        ...this.currentHouse,
        id,
        name: toLower(this.currentHouse.name),
        description: toLower(this.currentHouse.description)
      };
      await this.db.houses.put(houseToSave);
      await this.modal.dismiss(null, 'save');
      await this.loadData();
    } catch (err) {
      this.isSaving = false;
      console.error(err);
    }
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
