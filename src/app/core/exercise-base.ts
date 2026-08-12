import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExerciseData, ExerciseResult, ExerciseStatus } from './exercise-types';

/**
 * Базовый класс всех упражнений.
 * Управляет состояниями: idle, correct, incorrect, partial, answered.
 * Предоставляет унифицированный интерфейс @Input() data и @Output() result.
 *
 * В inline-режиме компонент автономен: после ответа сразу показывает
 * обратную связь и объяснение, не влияя на глобальный счёт.
 * В test-режиме результат передаётся родителю через @Output().
 */
@Component({
  template: '',
})
export abstract class ExerciseBase {
  /** Унифицированные данные упражнения. */
  @Input() data!: ExerciseData;

  /** Событие с результатом (используется в test-режиме). */
  @Output() result = new EventEmitter<ExerciseResult>();

  /** Текущий статус. */
  status: ExerciseStatus = 'idle';

  /** Нормированный балл 0..1. */
  score = 0;

  /** Режим работы. */
  get mode(): 'inline' | 'test' {
    return this.data?.mode ?? 'inline';
  }

  /** Заблокировано ли упражнение (после ответа). */
  get locked(): boolean {
    return this.status !== 'idle';
  }

  /** Завершить упражнение с результатом. */
  protected complete(status: ExerciseStatus, score: number): void {
    this.status = status;
    this.score = score;
    this.result.emit({ status, score, answered: true });
  }

  /** Сбросить упражнение (для повторной попытки). */
  reset(): void {
    this.status = 'idle';
    this.score = 0;
  }

  /** Вспомогательный статус для отображения обратной связи. */
  get feedbackClass(): string {
    switch (this.status) {
      case 'correct':
        return 'feedback-correct';
      case 'incorrect':
        return 'feedback-incorrect';
      case 'partial':
        return 'feedback-partial';
      case 'answered':
        return 'feedback-answered';
      default:
        return '';
    }
  }

  /** Иконка статуса. */
  get statusIcon(): string {
    switch (this.status) {
      case 'correct':
        return '✔';
      case 'incorrect':
        return '✘';
      case 'partial':
        return '◐';
      case 'answered':
        return '★';
      default:
        return '';
    }
  }
}