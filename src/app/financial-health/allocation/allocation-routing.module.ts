import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AllocationPage } from './allocation.page';

const routes: Routes = [
  {
    path: '',
    component: AllocationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AllocationPageRoutingModule {}
