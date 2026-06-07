import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PurchasesPageRoutingModule } from './purchases-routing.module';
import { PurchasesPage } from './purchases.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, PurchasesPageRoutingModule],
  declarations: [PurchasesPage]
})
export class PurchasesPageModule {}
