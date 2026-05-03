import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProjectionsPage } from './projections.page';

const routes: Routes = [
  {
    path: '',
    component: ProjectionsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectionsPageRoutingModule {}
