import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SettingsService } from '../services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class InitGuard implements CanActivate {
  constructor(private settings: SettingsService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    await this.settings.init();
    const screen = await this.settings.getInitialScreen();
    // getInitialScreen returns 'dashboard' by default
    return this.router.parseUrl('/' + screen);
  }
}
