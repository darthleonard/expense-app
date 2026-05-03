import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HousesPageRoutingModule } from './houses-routing.module';
import { TranslateModule } from '@ngx-translate/core';

import { HousesPage } from './houses.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HousesPageRoutingModule,
    TranslateModule
  ],
  declarations: [HousesPage]
})
export class HousesPageModule {}
