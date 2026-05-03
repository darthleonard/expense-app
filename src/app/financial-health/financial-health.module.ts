import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FinancialHealthPageRoutingModule } from './financial-health-routing.module';

import { FinancialHealthPage } from './financial-health.page';

import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FinancialHealthPageRoutingModule,
    TranslateModule
  ],
  declarations: [FinancialHealthPage]
})
export class FinancialHealthPageModule {}
