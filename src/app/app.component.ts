import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <div class="header-inner">
          <a routerLink="/" class="brand">
            <span class="brand-icon">🔥</span>
            <span class="brand-text">
              <span class="brand-title">Академия Промпт-Инжиниринга</span>
              <span class="brand-sub">Diablo Edition</span>
            </span>
          </a>
          <nav class="main-nav">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Статьи</a>
            <a routerLink="/test" routerLinkActive="active">Тест</a>
            <a routerLink="/results" routerLinkActive="active">Результаты</a>
          </nav>
        </div>
      </header>

      <main class="app-main">
        <router-outlet></router-outlet>
      </main>

      <footer class="app-footer">
        <div class="footer-inner">
          <span>⚔ Академия Промпт-Инжиниринга</span>
          <span class="footer-rune">ᚱ ᚢ ᚾ ᛖ</span>
          <span>Создано для обучения промпт-инжинирингу</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-shell { min-height: 100vh; display: flex; flex-direction: column; }
    .app-header {
      background: linear-gradient(180deg, #1a1713, #0f0e0c);
      border-bottom: 2px solid #3a322a;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .brand-icon { font-size: 28px; }
    .brand-text { display: flex; flex-direction: column; }
    .brand-title {
      font-family: 'Cinzel', serif;
      font-weight: 700;
      color: #e8c96a;
      font-size: 18px;
      letter-spacing: 1px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.8);
    }
    .brand-sub {
      font-family: 'UnifrakturCook', cursive;
      color: #a11f1f;
      font-size: 14px;
      letter-spacing: 2px;
    }
    .main-nav { display: flex; gap: 8px; }
    .main-nav a {
      padding: 8px 16px;
      color: #a89f8c;
      text-decoration: none;
      font-family: 'Cinzel', serif;
      font-size: 14px;
      letter-spacing: 1px;
      border: 1px solid transparent;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .main-nav a:hover { color: #e8c96a; border-color: #3a322a; }
    .main-nav a.active {
      color: #e8c96a;
      border-color: #a11f1f;
      background: rgba(161, 31, 31, 0.15);
    }
    .app-main { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 24px 20px; }
    .app-footer {
      background: #0f0e0c;
      border-top: 2px solid #3a322a;
      padding: 16px 20px;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #6f6757;
      font-size: 13px;
      flex-wrap: wrap;
    }
    .footer-rune { color: #8a6d1f; font-family: 'UnifrakturCook', cursive; font-size: 18px; letter-spacing: 4px; }

    @media (max-width: 600px) {
      .header-inner { flex-direction: column; align-items: flex-start; }
      .brand-title { font-size: 16px; }
      .main-nav { width: 100%; }
      .main-nav a { flex: 1; text-align: center; }
    }
  `]
})
export class AppComponent {}