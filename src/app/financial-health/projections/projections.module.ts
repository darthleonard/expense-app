import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProjectionsPageRoutingModule } from './projections-routing.module';

import { ProjectionsPage } from './projections.page';

import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProjectionsPageRoutingModule,
    TranslateModule
  ],
  declarations: [ProjectionsPage]
})
export class ProjectionsPageModule {}
