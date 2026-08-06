import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DataBackupPage } from './data-backup.page';

const routes: Routes = [
  {
    path: '',
    component: DataBackupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DataBackupPageRoutingModule {}
