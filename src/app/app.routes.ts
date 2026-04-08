import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/auth/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '', 
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      // Redirigimos politicas al viejo diagramComponent para que siga funcionando la logica de GoJS
      { path: 'politicas', loadComponent: () => import('./features/politica_negocio/pages/politica-list/politica-list.component').then(m => m.PoliticaListComponent) },
      { path: 'politicas/diagrama/:id', loadComponent: () => import('./features/politica_negocio/components/diagram-editor/diagram-editor.component').then(m => m.DiagramEditorComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
