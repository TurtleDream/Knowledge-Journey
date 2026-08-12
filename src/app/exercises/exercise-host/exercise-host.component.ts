import { Component, EventEmitter, Input, Output, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseData, ExerciseResult, ExerciseType, EXERCISE_TYPE_META } from '../../core/exercise-types';
import { MultipleChoiceComponent } from '../multiple-choice/multiple-choice.component';
import { TrueFalseComponent } from '../true-false/true-false.component';
import { FillTheBlankComponent } from '../fill-the-blank/fill-the-blank.component';
import { MatchPairsComponent } from '../match-pairs/match-pairs.component';
import { OrderStepsComponent } from '../order-steps/order-steps.component';
import { CaseStudyComponent } from '../case-study/case-study.component';
import { PromptSimulatorComponent } from '../prompt-simulator/prompt-simulator.component';
import { SpotTheHallucinationComponent } from '../spot-the-hallucination/spot-the-hallucination.component';
import { PromptBuilderComponent } from '../prompt-builder/prompt-builder.component';
import { PromptBattleComponent } from '../prompt-battle/prompt-battle.component';

const TYPE_COMPONENTS: Record<ExerciseType, any> = {
  'multiple-choice': MultipleChoiceComponent,
  'match-pairs': MatchPairsComponent,
  'fill-the-blank': FillTheBlankComponent,
  'true-false': TrueFalseComponent,
  'order-steps': OrderStepsComponent,
  'case-study': CaseStudyComponent,
  'prompt-simulator': PromptSimulatorComponent,
  'spot-the-hallucination': SpotTheHallucinationComponent,
  'prompt-builder': PromptBuilderComponent,
  'prompt-battle': PromptBattleComponent,
};

@Component({
  selector: 'app-exercise-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="exercise-host">
      <div class="exercise-type-label" *ngIf="showLabel">
        <span class="ex-type-icon" [style.color]="typeMeta.color">{{ typeMeta.icon }}</span>
        <span class="ex-type-name">{{ typeMeta.label }}</span>
      </div>
      <div class="exercise-host-container" #container></div>
    </div>
  `,
  styles: [`
    .exercise-host { margin: 24px 0; }
    .exercise-type-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 14px;
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #a89f8c;
      font-family: 'Cinzel', serif;
      margin-bottom: 8px;
    }
    .ex-type-icon { font-size: 16px; }
  `]
})
export class ExerciseHostComponent {
  @Input() data!: ExerciseData;
  @Input() showLabel = true;
  @Output() result = new EventEmitter<ExerciseResult>();

  @ViewChild('container', { read: ViewContainerRef, static: true }) container!: ViewContainerRef;

  private compRef: ComponentRef<ExerciseBase> | null = null;

  get typeMeta() {
    return EXERCISE_TYPE_META[this.data.type];
  }

  ngOnChanges(): void {
    this.render();
  }

  ngOnInit(): void {
    this.render();
  }

  private render(): void {
    if (!this.data) return;
    this.container.clear();

    const compClass = TYPE_COMPONENTS[this.data.type];
    if (!compClass) return;

    this.compRef = this.container.createComponent(compClass);
    const instance = this.compRef.instance as ExerciseBase;
    instance.data = this.data;

    // Прокидываем результат наверх
    if (instance.result) {
      instance.result.subscribe((r: ExerciseResult) => this.result.emit(r));
    }
  }
}