import { Component, OnInit } from '@angular/core';
import { SettingsService } from './core/services/settings.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  public appPages = [
    { title: 'DASHBOARD_TITLE', url: '/dashboard', icon: 'pie-chart' },
    { title: 'HOME_TITLE', url: '/home', icon: 'home' },
    { title: 'SHOPPING_TITLE', url: '/shopping', icon: 'cart' },
    { title: 'FUEL_TITLE', url: '/fuel', icon: 'car' },
    { title: 'INDIVIDUAL_EXPENSES_TITLE', url: '/individual-expenses', icon: 'cash' },
    { title: 'ANALYSIS_TITLE', url: '/analysis', icon: 'analytics' },
    { title: 'FINANCIAL_HEALTH', url: '/financial-health', icon: 'heart' },
    { title: 'DATABASE_ANALYSIS_TITLE', url: '/database-analysis', icon: 'shield-checkmark' },
    { title: 'DATA_BACKUP_TITLE', url: '/data-backup', icon: 'cloud-upload' },
    { title: 'CONFIG_TITLE', url: '/config', icon: 'settings' },
  ];

  constructor(
    private settings: SettingsService,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    // Wait for settings to initialize
    await this.settings.init();

    if (await this.settings.isFirstBoot()) {
      await this.presentLanguageSelection();
    }
  }

  async presentLanguageSelection() {
    const alert = await this.alertController.create({
      header: 'Select Language / Selecciona Idioma',
      backdropDismiss: false,
      inputs: [
        {
          name: 'es-MX',
          type: 'radio',
          label: 'Español (México)',
          value: 'es-MX',
          checked: true
        },
        {
          name: 'en-US',
          type: 'radio',
          label: 'English (US)',
          value: 'en-US'
        }
      ],
      buttons: [
        {
          text: 'OK',
          handler: (data) => {
            this.settings.setLanguage(data);
          }
        }
      ]
    });
    await alert.present();
  }
}
