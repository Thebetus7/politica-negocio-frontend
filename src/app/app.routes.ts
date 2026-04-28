import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/auth/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  {
    path: '', 
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      // Rutas para Admin
      { 
        path: 'departamentos', 
        loadComponent: () => import('./features/departamentos/pages/departamento-list/departamento-list.component').then(m => m.DepartamentoListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ROLE_ADMINISTRADOR'] }
      },
      { 
        path: 'usuarios', 
        loadComponent: () => import('./features/usuarios/pages/usuario-list/usuario-list.component').then(m => m.UsuarioListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ROLE_ADMINISTRADOR'] }
      },
      // Rutas para AC
      { 
        path: 'portafolios', 
        loadComponent: () => import('./features/portafolios/pages/portafolio-list/portafolio-list.component').then(m => m.PortafolioListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ATENCION_CLIENTE', 'ROLE_ATENCION_CLIENTE'] }
      },
      // Redirigimos politicas al viejo diagramComponent para que siga funcionando la logica de GoJS
      { 
        path: 'politicas', 
        loadComponent: () => import('./features/politica_negocio/pages/politica-list/politica-list.component').then(m => m.PoliticaListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'FUNCIONARIO', 'ROLE_FUNCIONARIO'] }
      },
      { 
        path: 'politicas/diagrama/:id', 
        loadComponent: () => import('./features/politica_negocio/components/workflow-editor/workflow-editor.component').then(m => m.WorkflowEditorComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'FUNCIONARIO', 'ROLE_FUNCIONARIO'] }
      },
      {
        path: 'formularios',
        loadComponent: () => import('./features/formularios/pages/formulario-list/formulario-list.component').then(m => m.FormularioListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ROLE_ADMINISTRADOR'] }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
