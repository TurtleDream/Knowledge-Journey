import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ARTICLES } from '../../content/articles.data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home">
      <section class="hero">
        <h1 class="hero-title">⚔ Академия Промпт-Инжиниринга</h1>
        <p class="hero-subtitle">
          Изучай теорию и сразу закрепляй практикой. Каждая статья содержит интерактивные упражнения,
          встроенные прямо в текст. Пройди финальный тест и проверь свои навыки.
        </p>
        <div class="hero-actions">
          <a routerLink="/test" class="btn btn-primary">Начать тест</a>
          <a routerLink="/results" class="btn btn-ghost">Мои результаты</a>
        </div>
      </section>

      <div class="rune-divider">ᚱ ᚢ ᚾ ᛖ</div>

      <section class="articles-section">
        <h2 class="section-title">Статьи</h2>
        <div class="articles-grid">
          <a
            *ngFor="let article of articles"
            [routerLink]="['/article', article.id]"
            class="article-card"
          >
            <div class="card-meta">
              <span class="card-icon">{{ article.icon }}</span>
              <span>{{ article.level }}</span>
              <span>•</span>
              <span>{{ article.readTime }}</span>
            </div>
            <h3>{{ article.title }}</h3>
            <p>{{ article.subtitle }}</p>
            <div class="card-tags">
              <span *ngFor="let tag of article.tags" class="tag">{{ tag }}</span>
            </div>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .hero {
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(180deg, rgba(161,31,31,0.08), transparent);
      border: 1px solid #3a322a;
      border-radius: 4px;
      position: relative;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 6px;
      border: 1px solid rgba(201,162,39,0.1);
      border-radius: 2px;
      pointer-events: none;
    }
    .hero-title {
      font-size: 36px;
      margin: 0 0 16px;
      color: #e8c96a;
      text-shadow: 0 0 20px rgba(201,162,39,0.3);
    }
    .hero-subtitle {
      max-width: 700px;
      margin: 0 auto 24px;
      color: #a89f8c;
      font-size: 16px;
      line-height: 1.7;
    }
    .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .section-title {
      font-size: 24px;
      margin: 0 0 20px;
      color: #e8c96a;
    }
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .card-icon { font-size: 20px; margin-right: 6px; }
    .card-tags { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
    .tag {
      padding: 2px 10px;
      background: rgba(161,31,31,0.15);
      border: 1px solid #5a4d3d;
      border-radius: 12px;
      font-size: 12px;
      color: #a89f8c;
    }

    @media (max-width: 600px) {
      .hero-title { font-size: 26px; }
      .articles-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class HomeComponent {
  articles = ARTICLES;
}