import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type BiasSeverity = 'low' | 'medium' | 'high';

@Entity('bias_flags')
@Index(['candidateId', 'jobId'])
export class BiasFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'signal_type', type: 'varchar', length: 100 })
  signalType: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'affected_criterion', type: 'varchar', length: 200, nullable: true })
  affectedCriterion: string | null;

  @Column({ type: 'varchar', length: 20 })
  severity: BiasSeverity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
