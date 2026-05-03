import { Component, OnInit } from '@angular/core';
import { DatabaseService, House } from '../core/services/database.service';

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

  constructor(private db: DatabaseService) { }

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
    if (house.id) {
      await this.db.houses.delete(house.id);
      await this.loadData();
    }
  }
}
