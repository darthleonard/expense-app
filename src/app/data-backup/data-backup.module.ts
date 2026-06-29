import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DataBackupPageRoutingModule } from './data-backup-routing.module';

import { DataBackupPage } from './data-backup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    DataBackupPageRoutingModule
  ],
  declarations: [DataBackupPage]
})
export class DataBackupPageModule {}
