import { Routes } from '@angular/router';
import { WelcomeComponent } from './views/welcome/welcome.component';

export const routes: Routes = [
    { path: 'welcome', component: WelcomeComponent },
    { path: 'host', loadComponent: () => import('./views/host/host.component').then(m => m.HostComponent) },
    { path: 'controller', loadComponent: () => import('./views/controller/controller.component').then(m => m.ControllerComponent) },
    { path: '', redirectTo: '/welcome', pathMatch: 'full' }, // Redirect to welcome by default
    { path: '**', redirectTo: '/welcome' } // Wildcard route for a 404 page
]; 