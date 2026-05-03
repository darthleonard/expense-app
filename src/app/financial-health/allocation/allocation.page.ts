import { Component } from '@angular/core';
import { FinancialHealthService, FinancialHealthValues } from '../../core/services/financial-health.service';
import { ViewWillEnter, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-allocation',
  templateUrl: './allocation.page.html',
  styleUrls: ['./allocation.page.scss'],
  standalone: false,
})
export class AllocationPage implements ViewWillEnter {
  showValues: boolean = true;
  values: FinancialHealthValues | null = null;
  hasIncome: boolean = false;

  constructor(
    private financialHealth: FinancialHealthService,
    private alertCtrl: AlertController
  ) {}

  async ionViewWillEnter() {
    const record = await this.financialHealth.getLatestIncome();
    if (record) {
      this.hasIncome = true;
      this.values = this.financialHealth.calculateValues(record.amount, record.period);
    } else {
      this.hasIncome = false;
      this.values = null;
    }
  }

  toggleVisibility() {
    this.showValues = !this.showValues;
  }

  async showHelp() {
    const alert = await this.alertCtrl.create({
      header: 'Ayuda',
      message: 'En esta página puedes visualizar la recomendación de distribución de tus ingresos mensuales basándose en la regla 50/30/20, modificada para priorizar la libertad financiera:\n\n- 50% Gastos Fijos (necesidades)\n- 20% Gastos Variables (estilo de vida)\n- 30% Construcción de Patrimonio (dividido en 10% Fondo de Paz, 10% Proyectos Personales, 10% Ahorro para Retiro).',
      buttons: ['OK']
    });
    await alert.present();
  }
}

