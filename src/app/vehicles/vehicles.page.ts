import { Component, OnInit } from '@angular/core';
import { DatabaseService, Car } from '../core/services/database.service';

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

  constructor(private db: DatabaseService) { }

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
        ...this.currentVehicle
      });
    } else {
      await this.db.cars.add({
        ...this.currentVehicle
      });
    }
    this.isModalOpen = false;
    await this.loadData();
  }

  async deleteVehicle(vehicle: Car) {
    if (vehicle.id) {
      await this.db.cars.delete(vehicle.id);
      await this.loadData();
    }
  }
}
