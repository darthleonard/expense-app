import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShoppingPage } from './shopping.page';

const routes: Routes = [
  {
    path: '',
    component: ShoppingPage,
    children: [
      {
        path: 'purchases',
        loadChildren: () => import('./purchases/purchases.module').then(m => m.PurchasesPageModule)
      },
      {
        path: 'products',
        loadChildren: () => import('./products/products.module').then(m => m.ProductsPageModule)
      },
      {
        path: 'establishments',
        loadChildren: () => import('./establishments/establishments.module').then(m => m.EstablishmentsPageModule)
      },
      {
        path: '',
        redirectTo: 'purchases',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'purchase-detail/:id',
    loadChildren: () => import('./purchase-detail/purchase-detail.module').then(m => m.PurchaseDetailPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShoppingPageRoutingModule {}
