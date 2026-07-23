import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IndividualExpensesPageRoutingModule } from './individual-expenses-routing.module';
import { IndividualExpensesPage } from './individual-expenses.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IndividualExpensesPageRoutingModule,
    TranslateModule
  ],
  declarations: [IndividualExpensesPage]
})
export class IndividualExpensesPageModule {}
