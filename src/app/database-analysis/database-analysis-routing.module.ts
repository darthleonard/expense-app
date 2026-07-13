import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DatabaseAnalysisPage } from './database-analysis.page';

const routes: Routes = [
  {
    path: '',
    component: DatabaseAnalysisPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DatabaseAnalysisPageRoutingModule {}
