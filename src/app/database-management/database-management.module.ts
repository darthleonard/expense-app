import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DatabaseManagementPageRoutingModule } from './database-management-routing.module';
import { DatabaseManagementPage } from './database-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    DatabaseManagementPageRoutingModule
  ],
  declarations: [DatabaseManagementPage]
})
export class DatabaseManagementPageModule {}
