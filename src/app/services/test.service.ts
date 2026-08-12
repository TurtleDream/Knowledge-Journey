import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ExerciseData, ExerciseResult } from '../core/exercise-types';

export interface TestProgress {
  currentIndex: number;
  totalScore: number;
  correctCount: number;
  answered: boolean[];
  currentQuestionId: string | null;
}

export interface TestResultRecord {
  id: string;
  date: string;
  score: number;
  percent: number;
  total: number;
  correct: number;
}

const PROGRESS_KEY = 'peacademy-test-progress';
const HISTORY_KEY = 'peacademy-test-history';

@Injectable({ providedIn: 'root' })
export class TestService {
  private progressSubject = new BehaviorSubject<TestProgress | null>(this.loadProgress());
  progress$ = this.progressSubject.asObservable();

  private historySubject = new BehaviorSubject<TestResultRecord[]>(this.loadHistory());
  history$ = this.historySubject.asObservable();

  /** Вопросы текущего теста (не сохраняем в localStorage — они статичны) */
  private questions: ExerciseData[] = [];

  setQuestions(q: ExerciseData[]): void {
    this.questions = q;
    const saved = this.loadProgress();
    if (!saved || saved.currentIndex >= q.length) {
      this.startNew();
    }
  }

  startNew(): void {
    const progress: TestProgress = {
      currentIndex: 0,
      totalScore: 0,
      correctCount: 0,
      answered: this.questions.map(() => false),
      currentQuestionId: null,
    };
    this.saveProgress(progress);
    this.progressSubject.next(progress);
  }

  get currentProgress(): TestProgress | null {
    return this.progressSubject.value;
  }

  get currentQuestion(): ExerciseData | null {
    const p = this.progressSubject.value;
    if (!p || !this.questions.length || p.currentIndex >= this.questions.length) return null;
    return this.questions[p.currentIndex];
  }

  get questionCount(): number {
    return this.questions.length;
  }

  submitAnswer(result: ExerciseResult): void {
    const p = this.progressSubject.value;
    if (!p) return;

    p.totalScore += result.score;
    p.answered[p.currentIndex] = true;
    if (result.status === 'correct') p.correctCount++;

    // Авто-переход к следующему вопросу
    if (p.currentIndex < this.questions.length - 1) {
      p.currentIndex++;
    }

    this.saveProgress(p);
    this.progressSubject.next({ ...p });
  }

  get isFinished(): boolean {
    const p = this.progressSubject.value;
    if (!p || !this.questions.length) return false;
    return p.currentIndex >= this.questions.length - 1 && p.answered.every(a => a);
  }

  finishTest(): TestResultRecord | null {
    const p = this.progressSubject.value;
    if (!p || !this.questions.length) return null;

    const record: TestResultRecord = {
      id: Date.now().toString(36),
      date: new Date().toLocaleString('ru-RU'),
      score: Math.round(p.totalScore * 10) / 10,
      percent: Math.round((p.totalScore / this.questions.length) * 100),
      total: this.questions.length,
      correct: p.correctCount,
    };

    const history = this.loadHistory();
    history.unshift(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
    this.historySubject.next(history.slice(0, 20));

    localStorage.removeItem(PROGRESS_KEY);
    this.progressSubject.next(null);
    return record;
  }

  private loadProgress(): TestProgress | null {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveProgress(p: TestProgress): void {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }

  private loadHistory(): TestResultRecord[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getHistory(): TestResultRecord[] {
    return this.historySubject.value;
  }
}