import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FinancialHealthPage } from './financial-health.page';

const routes: Routes = [
  {
    path: '',
    component: FinancialHealthPage,
    children: [
      {
        path: 'allocation',
        loadChildren: () => import('./allocation/allocation.module').then( m => m.AllocationPageModule)
      },
      {
        path: 'comparison',
        loadChildren: () => import('./comparison/comparison.module').then( m => m.ComparisonPageModule)
      },
      {
        path: '',
        redirectTo: 'comparison',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then( m => m.SettingsPageModule)
  },
  {
    path: 'projections',
    loadChildren: () => import('./projections/projections.module').then( m => m.ProjectionsPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinancialHealthPageRoutingModule {}
