import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type CriterionStatus = 'met' | 'partial' | 'not_met';
export type FitScoreStatus = 'ok' | 'error';

export interface ScoreBreakdownItem {
  criterion_label: string;
  status: CriterionStatus;
  contribution: number;
  explanation: string;
}

@Entity('fit_scores')
@Index(['candidateId', 'jobId'])
export class FitScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'criteria_version', type: 'integer' })
  criteriaVersion: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'jsonb', default: '[]' })
  breakdown: ScoreBreakdownItem[];

  @Column({ type: 'varchar', length: 10, default: 'ok' })
  status: FitScoreStatus;

  @CreateDateColumn({ name: 'computed_at', type: 'timestamptz' })
  computedAt: Date;
}
