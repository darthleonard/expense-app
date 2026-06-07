import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EstablishmentsPage } from './establishments.page';

const routes: Routes = [
  {
    path: '',
    component: EstablishmentsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EstablishmentsPageRoutingModule {}
