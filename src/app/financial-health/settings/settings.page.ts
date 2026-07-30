import { Component, OnInit } from '@angular/core';
import { FinancialHealthService } from '../../core/services/financial-health.service';
import { IncomeRecord } from '../../core/services/database.service';
import { AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  amount: number | null = null;
  period: 'monthly' | 'biweekly' | 'semimonthly' = 'monthly';
  history: IncomeRecord[] = [];
  originalAmount: number | null = null;
  originalPeriod: string = 'monthly';

  constructor(
    private financialHealth: FinancialHealthService,
    private alertCtrl: AlertController,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.history = await this.financialHealth.getAllIncomeHistory();
    if (this.history && this.history.length > 0) {
      if (!this.amount) {
        this.amount = this.history[0].amount;
        this.period = this.history[0].period;
      }
    }
    this.originalAmount = this.amount;
    this.originalPeriod = this.period;
  }

  hasUnsavedChanges(): boolean {
    return this.amount !== this.originalAmount || this.period !== this.originalPeriod;
  }

  async checkUnsavedAndLeave() {
    if (this.hasUnsavedChanges()) {
      const alert = await this.alertCtrl.create({
        header: 'Cambios sin guardar',
        message: '¿Estás seguro de abandonar la página? Se perderán los cambios no guardados.',
        buttons: [
          { text: 'CANCEL', role: 'cancel' },
          { text: 'Abandonar', handler: () => this.navCtrl.back() }
        ]
      });
      await alert.present();
    } else {
      this.navCtrl.back();
    }
  }

  async confirmSave() {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar guardado',
      message: '¿Estás seguro de que quieres guardar configuración?',
      buttons: [
        { text: 'CANCEL', role: 'cancel' },
        { text: 'SAVE', handler: () => this.save() }
      ]
    });
    await alert.present();
  }

  async save() {
    if (!this.amount || this.amount <= 0) return;
    await this.financialHealth.saveIncome(this.amount, this.period);
    this.amount = null; // optional reset
    this.loadHistory();
  }

  async deleteRecord(id: number | undefined) {
    if (id !== undefined) {
      await this.financialHealth.deleteIncomeRecord(id);
      this.loadHistory();
    }
  }

  async clearAll() {
    await this.financialHealth.clearIncomeHistory();
    this.history = [];
    this.amount = null;
  }

  async showHelp() {
    const alert = await this.alertCtrl.create({
      header: 'Ayuda - Configuración',
      message: 'Configura tu ingreso base. Puedes especificar si lo recibes de forma mensual, catorcenal o quincenal para calcular tu estimado mensual correctamente.',
      buttons: ['OK']
    });
    await alert.present();
  }
}

