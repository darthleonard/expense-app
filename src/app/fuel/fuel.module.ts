import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FuelPageRoutingModule } from './fuel-routing.module';

import { FuelPage } from './fuel.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FuelPageRoutingModule,
    TranslateModule
  ],
  declarations: [FuelPage]
})
export class FuelPageModule {}
