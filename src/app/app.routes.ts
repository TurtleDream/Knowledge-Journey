import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'article/:id',
    loadComponent: () => import('./pages/article/article.component').then(m => m.ArticleComponent),
  },
  {
    path: 'test',
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent),
  },
  {
    path: 'results',
    loadComponent: () => import('./pages/results/results.component').then(m => m.ResultsComponent),
  },
  {
    path: 'journey',
    loadComponent: () => import('./journey/pages/journey-input/journey-input.component').then(m => m.JourneyInputComponent),
  },
  {
    path: 'journey/settings',
    loadComponent: () => import('./journey/pages/journey-settings/journey-settings.component').then(m => m.JourneySettingsComponent),
  },
  {
    path: 'journey/map',
    loadComponent: () => import('./journey/pages/journey-map/journey-map.component').then(m => m.JourneyMapComponent),
  },
  {
    path: 'journey/checkpoint',
    loadComponent: () => import('./journey/pages/journey-checkpoint/journey-checkpoint.component').then(m => m.JourneyCheckpointComponent),
  },
  {
    path: 'journey/battle',
    loadComponent: () => import('./journey/pages/journey-battle/journey-battle.component').then(m => m.JourneyBattleComponent),
  },
  {
    path: 'journey/report',
    loadComponent: () => import('./journey/pages/journey-report/journey-report.component').then(m => m.JourneyReportComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];