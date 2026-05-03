import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ComparisonPage } from './comparison.page';

const routes: Routes = [
  {
    path: '',
    component: ComparisonPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComparisonPageRoutingModule {}
