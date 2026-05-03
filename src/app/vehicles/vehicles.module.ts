import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VehiclesPageRoutingModule } from './vehicles-routing.module';
import { TranslateModule } from '@ngx-translate/core';

import { VehiclesPage } from './vehicles.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VehiclesPageRoutingModule,
    TranslateModule
  ],
  declarations: [VehiclesPage]
})
export class VehiclesPageModule {}
