import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ARTICLES, Article } from '../../content/articles.data';
import { ExerciseHostComponent } from '../../exercises/exercise-host/exercise-host.component';
import { ReindexService } from '../../core/reindex.service';
import { UserContextService } from '../../core/user-context.service';

@Component({
  selector: 'app-article',
  standalone: true,
  imports: [CommonModule, RouterLink, ExerciseHostComponent],
  template: `
    <div class="article-page" *ngIf="article; else notFound">
      <a routerLink="/" class="back-link">← К списку статей</a>

      <header class="article-header">
        <div class="article-meta">
          <span class="article-icon">{{ article.icon }}</span>
          <span>{{ article.level }}</span>
          <span>•</span>
          <span>{{ article.readTime }}</span>
        </div>
        <h1 class="article-title">{{ article.title }}</h1>
        <p class="article-subtitle">{{ article.subtitle }}</p>
        <div class="article-tags">
          <span *ngFor="let tag of article.tags" class="tag">{{ tag }}</span>
        </div>
      </header>

      <div class="rune-divider">ᚱ ᚢ ᚾ ᛖ</div>

      <div class="article-body">
        <section *ngFor="let section of article.sections" class="article-section">
          <h2 *ngIf="section.heading" class="section-heading">{{ section.heading }}</h2>
          <p *ngFor="let para of section.paragraphs" class="section-para">{{ para }}</p>

          <div *ngFor="let exercise of section.exercises" class="inline-exercise">
            <app-exercise-host [data]="exercise" [showLabel]="true"></app-exercise-host>
          </div>
        </section>
      </div>

      <div class="rune-divider">ᚱ ᚢ ᚾ ᛖ</div>

      <div class="article-next">
        <button class="btn btn-study" *ngIf="!marked" (click)="markStudied()" [disabled]="marking">
          {{ marking ? 'Сохраняю…' : '✓ Я изучил эту статью' }}
        </button>
        <span class="marked-ok" *ngIf="marked">✓ Засчитано в прогрессе</span>
        <a routerLink="/test" class="btn btn-primary">Проверить знания в тесте →</a>
      </div>
    </div>

    <ng-template #notFound>
      <div class="not-found">
        <h2>Статья не найдена</h2>
        <a routerLink="/" class="btn btn-ghost">← На главную</a>
      </div>
    </ng-template>
  `,
  styles: [`
    .back-link { color: #a89f8c; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .back-link:hover { color: #e8c96a; }
    .article-header { margin-bottom: 8px; }
    .article-meta { color: #a89f8c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
    .article-icon { font-size: 24px; }
    .article-title { font-size: 32px; margin: 0 0 12px; color: #e8c96a; }
    .article-subtitle { color: #a89f8c; font-size: 17px; margin: 0 0 16px; }
    .article-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag {
      padding: 2px 10px;
      background: rgba(161,31,31,0.15);
      border: 1px solid #5a4d3d;
      border-radius: 12px;
      font-size: 12px;
      color: #a89f8c;
    }
    .article-body { max-width: 800px; }
    .article-section { margin-bottom: 32px; }
    .section-heading { font-size: 22px; color: #e8c96a; margin: 0 0 16px; }
    .section-para {
      font-size: 16px;
      line-height: 1.8;
      color: #e8e0d0;
      margin: 0 0 16px;
    }
    .inline-exercise { margin: 8px 0 24px; }
    .article-next { text-align: center; padding: 20px 0; display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }
    .btn-study { padding: 10px 24px; background: rgba(95,201,111,0.15); color: #5fc96f;
      border: 1px solid #3f9b4f; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .btn-study:hover { background: rgba(95,201,111,0.3); }
    .btn-study:disabled { opacity: 0.5; cursor: default; }
    .marked-ok { color: #5fc96f; font-size: 13px; }
    .not-found { text-align: center; padding: 60px 20px; }
    .not-found h2 { color: #e08a80; }

    @media (max-width: 600px) {
      .article-title { font-size: 24px; }
    }
  `]
})
export class ArticleComponent implements OnInit {
  article: Article | null = null;
  marked = false;
  marking = false;

  constructor(
    private route: ActivatedRoute,
    private reindex: ReindexService,
    private ctx: UserContextService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.article = ARTICLES.find(a => a.id === id) ?? null;
      this.marked = false;
    });
  }

  // изученность нужна RAG-фильтру (onlyStudied), событие — формуле mastery
  async markStudied(): Promise<void> {
    if (!this.article || this.marking) return;
    this.marking = true;
    try {
      await this.reindex.markStudied(this.article.id);
      // тема = первый тег статьи; чтение засчитываем как освоение
      await this.ctx.trackEvent({
        type: 'article-opened',
        topicId: this.article.tags[0] ?? this.article.title,
        correct: true,
      });
      this.marked = true;
    } catch (e) {
      console.error('markStudied failed', e);
    } finally {
      this.marking = false;
    }
  }
}
