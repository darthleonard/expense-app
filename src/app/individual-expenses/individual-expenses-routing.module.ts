import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IndividualExpensesPage } from './individual-expenses.page';

const routes: Routes = [
  {
    path: '',
    component: IndividualExpensesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IndividualExpensesPageRoutingModule {}
