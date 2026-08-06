import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DatabaseAnalysisPageRoutingModule } from './database-analysis-routing.module';
import { DatabaseAnalysisPage } from './database-analysis.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    DatabaseAnalysisPageRoutingModule
  ],
  declarations: [DatabaseAnalysisPage]
})
export class DatabaseAnalysisPageModule {}
