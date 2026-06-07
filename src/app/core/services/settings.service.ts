import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { TranslateService } from '@ngx-translate/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private _storage: Storage | null = null;
  private defaultLang = 'es-MX';
  public currentLang = 'es-MX';
  private _initPromise: Promise<void> | null = null;

  constructor(private storage: Storage, private translate: TranslateService, private platform: Platform) {
    // Start initialization eagerly so it runs in parallel with Angular bootstrap.
    // All callers that await init() will share this same promise.
    this._initPromise = this._doInit();
  }

  /** Returns a promise that resolves once storage and settings are ready. */
  async init(): Promise<void> {
    return this._initPromise!;
  }

  private async _doInit(): Promise<void> {
    try {
      await this.platform.ready();
      const storage = await this.storage.create();
      this._storage = storage;

      // load language
      let lang = await this.getLanguage();
      if (!lang) {
        const browserLang = (window.navigator && window.navigator.language) || '';
        lang = browserLang.toLowerCase().startsWith('es') ? 'es-MX' : 'en-US';
        await this.setLanguage(lang);
      }
      this.currentLang = lang;
      this.translate.setDefaultLang(lang);
      this.translate.use(lang);

      // load theme
      const theme = await this.getTheme();
      if (theme === 'dark') {
        document.documentElement.classList.add('ion-palette-dark');
      }
    } catch (e) {
      console.error('SettingsService _doInit ERROR:', e);
    }
  }

  async getLanguage(): Promise<string | undefined> {
    return this._storage?.get('app_lang');
  }

  async setLanguage(lang: string) {
    this.currentLang = lang;
    await this._storage?.set('app_lang', lang);
    this.translate.use(lang);
  }

  async getTheme(): Promise<'light' | 'dark' | undefined> {
    return this._storage?.get('app_theme');
  }

  async setTheme(theme: 'light' | 'dark') {
    await this._storage?.set('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('ion-palette-dark');
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
    }
  }

  async getInitialScreen(): Promise<string> {
    const screen = await this._storage?.get('initial_screen');
    return screen || 'dashboard';
  }

  async setInitialScreen(screen: string) {
    await this._storage?.set('initial_screen', screen);
  }

  async getSelectedHouse(): Promise<number | null> {
    const id = await this._storage?.get('selected_house');
    return id ? parseInt(id, 10) : null;
  }

  async setSelectedHouse(id: number | null) {
    if (id === null) {
      await this._storage?.remove('selected_house');
    } else {
      await this._storage?.set('selected_house', id.toString());
    }
  }

  async getSelectedCar(): Promise<number | null> {
    const id = await this._storage?.get('selected_car');
    return id ? parseInt(id, 10) : null;
  }

  async setSelectedCar(id: number | null) {
    if (id === null) {
      await this._storage?.remove('selected_car');
    } else {
      await this._storage?.set('selected_car', id.toString());
    }
  }

  async getDashboardSelectedHouse(): Promise<number | 'all'> {
    const id = await this._storage?.get('dashboard_selected_house');
    if (id === undefined || id === null) return 'all';
    return id === 'all' ? 'all' : parseInt(id, 10);
  }

  async setDashboardSelectedHouse(id: number | 'all') {
    await this._storage?.set('dashboard_selected_house', id.toString());
  }

  async getDashboardSelectedCar(): Promise<number | 'all'> {
    const id = await this._storage?.get('dashboard_selected_car');
    if (id === undefined || id === null) return 'all';
    return id === 'all' ? 'all' : parseInt(id, 10);
  }

  async setDashboardSelectedCar(id: number | 'all') {
    await this._storage?.set('dashboard_selected_car', id.toString());
  }

  async isFirstBoot(): Promise<boolean> {
    const booted = await this._storage?.get('first_boot_done');
    if (!booted) {
      await this._storage?.set('first_boot_done', true);
      return true;
    }
    return false;
  }
}
