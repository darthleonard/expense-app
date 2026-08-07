import { Component, OnInit } from '@angular/core';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: false
})
export class AboutPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  
  async openPrivacyPolicy() {
    await Browser.open({url: 'https://darthleonard.wordpress.com/privacy-policy-spendly/'});
  }
}
