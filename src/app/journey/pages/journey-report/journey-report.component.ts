import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JourneyStateService } from '../../services/journey-state.service';
import { HeroPanelComponent } from '../../components/hero-panel/hero-panel.component';
import { JourneyReport, ActivityResult, CheckpointStatus } from '../../models/journey.models';

@Component({
  selector: 'app-journey-report',
  standalone: true,
  imports: [CommonModule, HeroPanelComponent],
  template: `
    <div class="report-page" *ngIf="report">
      <app-hero-panel></app-hero-panel>

      <div class="report-panel" #reportContent>
        <div class="report-header">
          <h1 class="report-title">📜 Свиток знаний</h1>
          <div class="report-meta">
            <div class="meta-row"><span class="meta-label">Имя:</span> <span class="meta-value">{{ report.userName }}</span></div>
            <div class="meta-row"><span class="meta-label">Дата:</span> <span class="meta-value">{{ report.date }}</span></div>
            <div class="meta-row"><span class="meta-label">Тема:</span> <span class="meta-value">{{ report.topic }}</span></div>
            <div class="meta-row"><span class="meta-label">Путешествие:</span> <span class="meta-value">{{ report.journeyTitle }}</span></div>
          </div>
        </div>

        <div class="report-overall">
          <div class="overall-score" [class.good]="report.overallPercent >= 70" [class.mid]="report.overallPercent >= 40 && report.overallPercent < 70" [class.bad]="report.overallPercent < 40">
            {{ report.overallPercent }}%
          </div>
          <div class="overall-detail">
            <span>Общий результат: {{ report.overallScore }} / {{ report.activityTable.length * 10 }}</span>
            <span>Всего XP: {{ report.totalXp }}</span>
          </div>
        </div>

        <div class="report-section">
          <h2 class="section-title">🗺 Карта чекпоинтов</h2>
          <div class="checkpoint-map">
            <div *ngFor="let cp of report.checkpointMap" class="cp-map-item" [class]="cp.status">
              <span class="cp-map-icon">{{ cp.status === 'completed' ? '✔' : cp.status === 'failed' ? '✘' : '🔒' }}</span>
              <span class="cp-map-title">{{ cp.title }}</span>
              <span class="cp-map-score">{{ cp.score }} / {{ cp.maxScore }}</span>
            </div>
          </div>
        </div>

        <div class="report-section">
          <h2 class="section-title">📋 Таблица активностей</h2>
          <div class="activity-table">
            <div class="table-header">
              <span>Вопрос</span>
              <span>Ответ</span>
              <span>Оценка</span>
              <span>XP</span>
            </div>
            <div *ngFor="let a of report.activityTable" class="table-row">
              <div class="cell-question">{{ a.question }}</div>
              <div class="cell-answer">{{ a.userAnswer }}</div>
              <div class="cell-score">{{ a.score }} / {{ a.maxScore }}</div>
              <div class="cell-xp">+{{ a.xpEarned }}</div>
            </div>
          </div>
        </div>

        <div class="report-section" *ngIf="report.weakAreas.length > 0">
          <h2 class="section-title">⚠ Слабые места</h2>
          <ul class="weak-list">
            <li *ngFor="let w of report.weakAreas">{{ w }}</li>
          </ul>
        </div>

        <div class="report-section" *ngIf="report.recommendations.length > 0">
          <h2 class="section-title">📚 Рекомендации</h2>
          <ul class="rec-list">
            <li *ngFor="let r of report.recommendations">{{ r }}</li>
          </ul>
        </div>

        <div class="report-section" *ngIf="report.achievements.length > 0">
          <h2 class="section-title">🏆 Достижения</h2>
          <div class="achievements-list">
            <div *ngFor="let a of report.achievements" class="achievement-item">
              <span class="ach-icon">{{ a.icon }}</span>
              <div class="ach-detail">
                <div class="ach-title">{{ a.title }}</div>
                <div class="ach-desc">{{ a.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="report-actions">
        <button class="btn btn-primary" (click)="exportPdf()">📄 Скачать PDF</button>
        <button class="btn btn-ghost" (click)="exportJson()">💾 Скачать JSON</button>
        <button class="btn btn-ghost" (click)="goHome()">🏠 На главную</button>
      </div>
    </div>

    <div class="no-report" *ngIf="!report">
      <h2>Нет завершённого путешествия</h2>
      <button class="btn btn-primary" (click)="goHome()">⚔ Создать путешествие</button>
    </div>
  `,
  styles: [`
    .report-page { max-width: 900px; margin: 0 auto; }
    .report-panel {
      background: linear-gradient(180deg, #2a2418, #1a1713);
      border: 3px solid #8a6d1f;
      border-radius: 8px;
      padding: 32px;
      margin: 20px 0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    .report-header { text-align: center; margin-bottom: 24px; }
    .report-title {
      font-size: 32px;
      color: #e8c96a;
      margin: 0 0 16px;
      text-shadow: 0 0 20px rgba(201,162,39,0.3);
    }
    .report-meta { display: flex; flex-direction: column; gap: 4px; }
    .meta-row { display: flex; gap: 8px; }
    .meta-label { color: #a89f8c; font-size: 14px; min-width: 100px; }
    .meta-value { color: #e8e0d0; font-size: 14px; }
    .report-overall {
      text-align: center;
      padding: 20px;
      margin-bottom: 24px;
      background: rgba(201,162,39,0.05);
      border: 1px solid #8a6d1f;
      border-radius: 8px;
    }
    .overall-score {
      font-size: 56px;
      font-family: 'Cinzel', serif;
      font-weight: 700;
    }
    .overall-score.good { color: #5fc96f; }
    .overall-score.mid { color: #e8c96a; }
    .overall-score.bad { color: #e08a80; }
    .overall-detail {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #a89f8c;
      font-size: 14px;
      margin-top: 8px;
    }
    .report-section { margin-bottom: 24px; }
    .section-title {
      font-size: 20px;
      color: #e8c96a;
      margin: 0 0 12px;
      border-bottom: 1px solid #3a322a;
      padding-bottom: 8px;
    }
    .checkpoint-map { display: flex; flex-direction: column; gap: 8px; }
    .cp-map-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 4px;
    }
    .cp-map-item.completed { border-left: 4px solid #3f9b4f; }
    .cp-map-item.failed { border-left: 4px solid #a11f1f; }
    .cp-map-icon { font-size: 18px; }
    .cp-map-title { flex: 1; color: #e8e0d0; font-size: 14px; }
    .cp-map-score { color: #a89f8c; font-size: 14px; }
    .activity-table { display: flex; flex-direction: column; gap: 4px; }
    .table-header, .table-row {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 0.5fr;
      gap: 8px;
      padding: 8px 12px;
      font-size: 13px;
    }
    .table-header {
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #a89f8c;
      font-family: 'Cinzel', serif;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .table-row {
      background: rgba(20,18,16,0.5);
      border: 1px solid #2a2418;
      border-radius: 4px;
      color: #e8e0d0;
    }
    .cell-question, .cell-answer { overflow: hidden; text-overflow: ellipsis; }
    .cell-score { color: #e8c96a; }
    .cell-xp { color: #5fc96f; }
    .weak-list, .rec-list {
      margin: 0;
      padding-left: 20px;
      color: #e8e0d0;
      font-size: 14px;
      line-height: 1.7;
    }
    .weak-list li { color: #e08a80; }
    .rec-list li { color: #5fc96f; }
    .achievements-list { display: flex; flex-direction: column; gap: 8px; }
    .achievement-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(232,201,106,0.05);
      border: 1px solid #8a6d1f;
      border-radius: 4px;
    }
    .ach-icon { font-size: 24px; }
    .ach-title { color: #e8c96a; font-family: 'Cinzel', serif; font-size: 14px; }
    .ach-desc { color: #a89f8c; font-size: 12px; }
    .report-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    .no-report { text-align: center; padding: 60px 20px; }
    .no-report h2 { color: #e8c96a; margin-bottom: 24px; }
  `]
})
export class JourneyReportComponent implements OnInit {
  report: JourneyReport | null = null;

  constructor(
    private stateService: JourneyStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildReport();
  }

  private buildReport(): void {
    const journey = this.stateService.journey();
    const state = this.stateService.state();
    if (!journey || !state) return;

    const allActivities: ActivityResult[] = state.checkpointResults.flatMap((cr) => cr.activityResults);
    const totalScore = allActivities.reduce((sum, a) => sum + a.score, 0);
    const totalMax = allActivities.reduce((sum, a) => sum + a.maxScore, 0);

    this.report = {
      userName: 'Путешественник',
      date: new Date().toLocaleString('ru-RU'),
      topic: journey.topic,
      journeyTitle: journey.title,
      overallScore: totalScore,
      overallPercent: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
      totalXp: state.xp,
      checkpointMap: state.checkpointResults.map((cr) => ({
        checkpointId: cr.checkpointId,
        title: cr.title,
        status: cr.status,
        score: cr.totalScore,
        maxScore: cr.maxScore,
      })),
      activityTable: allActivities,
      weakAreas: this.extractWeakAreas(allActivities),
      recommendations: this.buildRecommendations(allActivities),
      achievements: state.achievements,
    };
  }

  private extractWeakAreas(activities: ActivityResult[]): string[] {
    const weak = activities
      .filter((a) => a.score / a.maxScore < 0.5)
      .map((a) => a.question);
    return weak.slice(0, 5);
  }

  private buildRecommendations(activities: ActivityResult[]): string[] {
    const recs: string[] = [];
    const failed = activities.filter((a) => a.score / a.maxScore < 0.5);
    if (failed.length > 0) {
      recs.push(`Повторите темы: ${failed.map((a) => a.question).slice(0, 3).join(', ')}`);
    }
    const misconceptions = activities.flatMap((a) => a.misconceptions);
    if (misconceptions.length > 0) {
      recs.push(`Разберите заблуждения: ${misconceptions.slice(0, 3).join(', ')}`);
    }
    if (recs.length === 0) {
      recs.push('Отличная работа! Продолжайте в том же духе.');
    }
    return recs;
  }

  exportJson(): void {
    if (!this.report) return;
    const blob = new Blob([JSON.stringify(this.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journey-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.stateService.markReportDownloaded();
  }

  async exportPdf(): Promise<void> {
    if (!this.report) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Заголовок
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(138, 109, 31);
      doc.text('📜 Свиток знаний', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Имя: ${this.report.userName}`, 20, 40);
      doc.text(`Дата: ${this.report.date}`, 20, 48);
      doc.text(`Тема: ${this.report.topic}`, 20, 56);
      doc.text(`Путешествие: ${this.report.journeyTitle}`, 20, 64);

      // Общий результат
      doc.setFontSize(16);
      doc.setTextColor(138, 109, 31);
      doc.text('Общий результат', 20, 80);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${this.report.overallPercent}% (${this.report.overallScore} баллов)`, 20, 90);
      doc.text(`Всего XP: ${this.report.totalXp}`, 20, 98);

      // Чекпоинты
      doc.setFontSize(16);
      doc.setTextColor(138, 109, 31);
      doc.text('Карта чекпоинтов', 20, 114);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      let y = 124;
      for (const cp of this.report.checkpointMap) {
        doc.text(`${cp.status === 'completed' ? '✔' : '✘'} ${cp.title}: ${cp.score}/${cp.maxScore}`, 20, y);
        y += 8;
      }

      // Активности
      doc.setFontSize(16);
      doc.setTextColor(138, 109, 31);
      doc.text('Активности', 20, y + 10);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      y += 20;
      for (const a of this.report.activityTable) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`Q: ${a.question.substring(0, 60)}`, 20, y);
        doc.text(`A: ${a.userAnswer.substring(0, 60)}`, 20, y + 5);
        doc.text(`Оценка: ${a.score}/${a.maxScore} | XP: +${a.xpEarned}`, 20, y + 10);
        y += 16;
      }

      // Слабые места и рекомендации
      if (this.report.weakAreas.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(138, 109, 31);
        doc.text('Слабые места', 20, 20);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        let wy = 30;
        for (const w of this.report.weakAreas) {
          doc.text(`• ${w.substring(0, 80)}`, 20, wy);
          wy += 8;
        }
      }

      if (this.report.recommendations.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(138, 109, 31);
        doc.text('Рекомендации', 20, 60);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        let ry = 70;
        for (const r of this.report.recommendations) {
          doc.text(`• ${r.substring(0, 80)}`, 20, ry);
          ry += 8;
        }
      }

      doc.save(`journey-report-${Date.now()}.pdf`);
      this.stateService.markReportDownloaded();
    } catch (err) {
      console.error('PDF export error:', err);
    }
  }

  goHome(): void {
    this.router.navigate(['/journey']);
  }
}