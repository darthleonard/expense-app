import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ShareDataPageRoutingModule } from './share-data-routing.module';
import { ShareDataPage } from './share-data.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ShareDataPageRoutingModule,
  ],
  declarations: [ShareDataPage],
})
export class ShareDataPageModule {}
