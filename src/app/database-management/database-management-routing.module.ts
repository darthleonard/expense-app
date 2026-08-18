import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DatabaseManagementPage } from './database-management.page';

const routes: Routes = [
  {
    path: '',
    component: DatabaseManagementPage,
    children: [
      {
        path: 'info',
        loadChildren: () => import('./app-info/app-info.module').then(m => m.AppInfoPageModule)
      },
      {
        path: 'data-backup',
        loadChildren: () => import('./data-backup/data-backup.module').then(m => m.DataBackupPageModule)
      },
      {
        path: 'database-analysis',
        loadChildren: () => import('./database-analysis/database-analysis.module').then(m => m.DatabaseAnalysisPageModule)
      },
      {
        path: 'share-data',
        loadChildren: () => import('./share-data/share-data.module').then(m => m.ShareDataPageModule)
      },
      {
        path: '',
        redirectTo: 'info',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DatabaseManagementPageRoutingModule {}
