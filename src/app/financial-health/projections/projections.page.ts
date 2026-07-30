import { Component } from '@angular/core';
import { FinancialHealthService, FinancialHealthValues } from '../../core/services/financial-health.service';
import { AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-projections',
  templateUrl: './projections.page.html',
  styleUrls: ['./projections.page.scss'],
  standalone: false,
})
export class ProjectionsPage {
  amount: number | null = null;
  period: 'monthly' | 'biweekly' | 'semimonthly' = 'monthly';
  values: FinancialHealthValues | null = null;
  showValues: boolean = true;

  constructor(
    private financialHealth: FinancialHealthService,
    private alertCtrl: AlertController,
    private navCtrl: NavController
  ) { }

  calculate() {
    if (this.amount && this.amount > 0) {
      this.values = this.financialHealth.calculateValues(this.amount, this.period);
    } else {
      this.values = null;
    }
  }

  toggleVisibility() {
    this.showValues = !this.showValues;
  }

  hasUnsavedChanges(): boolean {
    return this.amount !== null || this.period !== 'monthly';
  }

  async checkUnsavedAndLeave() {
    if (this.hasUnsavedChanges()) {
      const alert = await this.alertCtrl.create({
        header: 'Abandonar proyecciones',
        message: '¿Estás seguro de abandonar la página? Se perderán los datos ingresados para la proyección.',
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

  async showHelp() {
    const alert = await this.alertCtrl.create({
      header: 'Ayuda - Proyecciones',
      message: 'Aquí puedes simular qué pasaría con tu presupuesto si tuvieras un ingreso diferente. Los datos aquí no se guardan en el sistema.',
      buttons: ['OK']
    });
    await alert.present();
  }
}

