import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ShareDataPage } from './share-data.page';

const routes: Routes = [
  {
    path: '',
    component: ShareDataPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShareDataPageRoutingModule {}
