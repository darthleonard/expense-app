import { Component, OnInit, ViewChild } from '@angular/core';
import { DatabaseService, FuelRecord, Car } from '../core/services/database.service';
import { SettingsService } from '../core/services/settings.service';
import { IonModal } from '@ionic/angular';
import { HasChangesService } from '../core/services/has-changes.service';

@Component({
  selector: 'app-fuel',
  templateUrl: './fuel.page.html',
  styleUrls: ['./fuel.page.scss'],
  standalone: false
})
export class FuelPage implements OnInit {
  records: FuelRecord[] = [];
  vehicles: Car[] = [];
  selectedCarId: number | null = null;
  isImperial = false;
  
  isModalOpen = false;
  isSaving = false;
  editingRecord: FuelRecord | null = null;
  currentRecord: any = this.getDefaultRecord();

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private db: DatabaseService, 
    public settings: SettingsService,
    private hasChangesService: HasChangesService
  ) { }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    const lang = await this.settings.getLanguage();
    this.isImperial = lang === 'en-US';
    this.selectedCarId = await this.settings.getSelectedCar();
    await this.loadData();
  }

  async loadData() {
    this.vehicles = await this.db.cars.toArray();
    
    if (this.vehicles.length === 1) {
      this.selectedCarId = this.vehicles[0].id!;
      await this.settings.setSelectedCar(this.selectedCarId);
    } else if (this.selectedCarId && !this.vehicles.some(v => v.id === this.selectedCarId)) {
      this.selectedCarId = null;
    }

    // Auto-select first vehicle if none selected but vehicles exist
    if (this.vehicles.length > 0 && !this.selectedCarId) {
      this.selectedCarId = this.vehicles[0].id!;
      await this.settings.setSelectedCar(this.selectedCarId);
    } else if (this.vehicles.length === 0) {
      this.selectedCarId = null;
    }

    if (this.selectedCarId) {
      const allRecords = await this.db.fuelRecords.orderBy('date').reverse().toArray();
      this.records = allRecords.filter(r => r.carId === this.selectedCarId);
    } else {
      this.records = [];
    }
  }

  async onCarChange(event: any) {
    this.selectedCarId = event.detail.value;
    await this.settings.setSelectedCar(this.selectedCarId);
    await this.loadData();
  }

  formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat(this.settings.currentLang || 'es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  getDefaultRecord(): FuelRecord {
    const now = new Date();
    const localDateTime = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    return {
      odometer: 0,
      unitPrice: 0,
      totalPrice: 0,
      liters: 0,
      date: localDateTime
    };
  }

  openModal(record?: FuelRecord) {
    this.isSaving = false;
    if (record) {
      this.editingRecord = record;
      let displayLiters = record.liters;
      let displayPrice = record.unitPrice;
      let displayOdometer = record.odometer;

      if (this.isImperial) {
        if (displayLiters) displayLiters = displayLiters / 3.78541;
        if (displayPrice) displayPrice = displayPrice * 3.78541;
        if (displayOdometer) displayOdometer = displayOdometer / 1.60934;
      }
      this.currentRecord = { 
        ...record, 
        liters: displayLiters ? parseFloat(displayLiters.toFixed(2)) : null,
        unitPrice: displayPrice ? parseFloat(displayPrice.toFixed(2)) : null,
        odometer: displayOdometer ? Math.round(displayOdometer) : null
      };
    } else {
      this.editingRecord = null;
      this.currentRecord = this.getDefaultRecord();
    }
    this.isModalOpen = true;
  }

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save' || this.isSaving) return true;
    
    const isChanged = this.hasChangesService.hasChanges(
      this.editingRecord || this.getDefaultRecord(),
      this.currentRecord
    );
    
    if (isChanged) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  };

  async saveRecord() {
    if (!this.selectedCarId) return;

    this.isSaving = true;
    let { odometer, unitPrice, totalPrice, liters, date } = this.currentRecord;
    
    if (unitPrice && liters && !totalPrice) {
      totalPrice = unitPrice * liters;
    } else if (totalPrice && liters && !unitPrice) {
      unitPrice = totalPrice / liters;
    } else if (totalPrice && unitPrice && !liters) {
      liters = totalPrice / unitPrice;
    }
    
    let internalLiters = liters;
    let internalPrice = unitPrice;
    let internalOdometer = odometer;

    if (this.isImperial) {
      if (liters) internalLiters = liters * 3.78541;
      if (unitPrice) internalPrice = unitPrice / 3.78541;
      if (odometer) internalOdometer = odometer * 1.60934;
    }

    const now = new Date().toISOString();

    const recToSave: FuelRecord = {
      carId: this.selectedCarId,
      odometer: internalOdometer || 0,
      unitPrice: internalPrice || 0,
      totalPrice: totalPrice || 0,
      liters: internalLiters || 0,
      date: date || now,
      lastModDate: now
    };

    try {
      if (this.editingRecord && this.editingRecord.id) {
        recToSave.creationDate = this.editingRecord.creationDate || now;
        await this.db.fuelRecords.update(this.editingRecord.id, recToSave);
      } else {
        recToSave.creationDate = now;
        await this.db.fuelRecords.add(recToSave);
      }
      await this.modal.dismiss(null, 'save');
      await this.loadData();
    } catch (err) {
      this.isSaving = false;
      console.error(err);
    }
  }

  async deleteRecord(rec: FuelRecord) {
    if (rec.id) {
      await this.db.fuelRecords.delete(rec.id);
      await this.loadData();
    }
  }

  getDisplayVolume(liters: number): number {
    return this.isImperial ? liters / 3.78541 : liters;
  }
  
  getDisplayDistance(km: number): number {
    return this.isImperial ? km / 1.60934 : km;
  }

  getDisplayUnitPrice(upL: number): number {
    return this.isImperial ? upL * 3.78541 : upL;
  }

  getCarIcon(carId?: number | null): string {
    if (!carId) return 'car';
    const car = this.vehicles.find(v => v.id === carId);
    return car?.icon || 'car';
  }
}
