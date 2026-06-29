import { Component, OnInit } from '@angular/core';
import { DatabaseService, Car, toLower } from '../core/services/database.service';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.page.html',
  styleUrls: ['./vehicles.page.scss'],
  standalone: false
})
export class VehiclesPage implements OnInit {
  vehicles: Car[] = [];
  isModalOpen = false;
  editingVehicle: Car | null = null;
  currentVehicle: Car = this.getDefaultVehicle();

  constructor(private db: DatabaseService,
    private alertCtrl: AlertController,
    private translate: TranslateService
  ) { }

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.vehicles = await this.db.cars.toArray();
  }

  getDefaultVehicle(): Car {
    return { name: '', description: '', icon: 'car' };
  }

  openModal(vehicle?: Car) {
    if (vehicle) {
      this.editingVehicle = vehicle;
      this.currentVehicle = { ...vehicle };
    } else {
      this.editingVehicle = null;
      this.currentVehicle = this.getDefaultVehicle();
    }
    this.isModalOpen = true;
  }

  async saveVehicle() {
    if (!this.currentVehicle.name.trim()) return;
    
    if (this.editingVehicle && this.editingVehicle.id) {
      await this.db.cars.update(this.editingVehicle.id, {
        ...this.currentVehicle,
        name: toLower(this.currentVehicle.name),
        description: toLower(this.currentVehicle.description)
      });
    } else {
      await this.db.cars.add({
        ...this.currentVehicle,
        name: toLower(this.currentVehicle.name),
        description: toLower(this.currentVehicle.description)
      });
    }
    this.isModalOpen = false;
    await this.loadData();
  }

  async deleteVehicle(vehicle: Car) {
    if (!vehicle.id) return;

    const fuelRecords = await this.db.fuelRecords.where('carId').equals(vehicle.id).toArray();
    if(fuelRecords.length > 0) {
      this.confirmDelete(vehicle);
      return;
    }
    
    await this.db.cars.delete(vehicle.id);
    await this.loadData();
  }

  async confirmDelete(vehicle: Car) {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('DELETE'),
        message: this.translate.instant('VEHICLE_HAS_FUEL_RECORDS'),
        buttons: [
          { text: this.translate.instant('CANCEL'), role: 'cancel' },
          {
            text: this.translate.instant('DELETE'),
            role: 'destructive',
            handler: async () => {
              await this.db.fuelRecords.where('carId').equals(vehicle.id!).delete();
              await this.db.cars.delete(vehicle.id!);
              await this.loadData();
            }
          }
        ]
      });
      await alert.present();
    }
}
