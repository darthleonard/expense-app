import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { EstablishmentsPageRoutingModule } from './establishments-routing.module';
import { EstablishmentsPage } from './establishments.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, EstablishmentsPageRoutingModule],
  declarations: [EstablishmentsPage]
})
export class EstablishmentsPageModule {}
