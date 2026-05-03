import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../core/services/settings.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.page.html',
  styleUrls: ['./config.page.scss'],
  standalone: false
})
export class ConfigPage implements OnInit {
  selectedLanguage: string = 'es-MX';
  isDarkMode: boolean = false;
  initialScreen: string = 'dashboard';

  constructor(private settings: SettingsService) { }

  async ngOnInit() {
    const lang = await this.settings.getLanguage();
    if (lang) this.selectedLanguage = lang;

    const theme = await this.settings.getTheme();
    this.isDarkMode = theme === 'dark';

    this.initialScreen = await this.settings.getInitialScreen();
  }

  onLanguageChange(event: any) {
    this.settings.setLanguage(this.selectedLanguage);
  }

  onThemeChange(event: any) {
    this.settings.setTheme(this.isDarkMode ? 'dark' : 'light');
  }

  onInitialScreenChange(event: any) {
    this.settings.setInitialScreen(this.initialScreen);
  }
}
