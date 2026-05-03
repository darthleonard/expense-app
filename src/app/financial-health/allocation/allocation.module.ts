import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AllocationPageRoutingModule } from './allocation-routing.module';

import { AllocationPage } from './allocation.page';

import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AllocationPageRoutingModule,
    TranslateModule
  ],
  declarations: [AllocationPage]
})
export class AllocationPageModule {}
