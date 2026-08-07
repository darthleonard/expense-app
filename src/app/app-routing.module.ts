import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { InitGuard } from './core/guards/init.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [InitGuard],
    children: []
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'fuel',
    loadChildren: () => import('./fuel/fuel.module').then( m => m.FuelPageModule)
  },
  {
    path: 'analysis',
    loadChildren: () => import('./analysis/analysis.module').then( m => m.AnalysisPageModule)
  },
  {
    path: 'database-management',
    loadChildren: () => import('./database-management/database-management.module').then( m => m.DatabaseManagementPageModule)
  },
  {
    path: 'database-analysis',
    redirectTo: 'database-management/database-analysis',
    pathMatch: 'full'
  },
  {
    path: 'data-backup',
    redirectTo: 'database-management/data-backup',
    pathMatch: 'full'
  },
  {
    path: 'config',
    loadChildren: () => import('./config/config.module').then( m => m.ConfigPageModule)
  },
  {
    path: 'financial-health',
    loadChildren: () => import('./financial-health/financial-health.module').then( m => m.FinancialHealthPageModule)
  },
  {
    path: 'vehicles',
    loadChildren: () => import('./vehicles/vehicles.module').then( m => m.VehiclesPageModule)
  },
  {
    path: 'houses',
    loadChildren: () => import('./houses/houses.module').then( m => m.HousesPageModule)
  },
  {
    path: 'shopping',
    loadChildren: () => import('./shopping/shopping.module').then( m => m.ShoppingPageModule)
  },
  {
    path: 'individual-expenses',
    loadChildren: () => import('./individual-expenses/individual-expenses.module').then( m => m.IndividualExpensesPageModule)
  },
  {
    path: 'about',
    loadChildren: () => import('./about/about.module').then( m => m.AboutPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
