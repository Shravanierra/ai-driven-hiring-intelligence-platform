import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ShortlistDecision = 'pending' | 'accepted' | 'rejected' | 'deferred';

@Entity('shortlist_entries')
@Index(['jobId', 'candidateId'], { unique: true })
export class ShortlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ type: 'integer' })
  rank: number;

  @Column({ name: 'fit_score', type: 'decimal', precision: 5, scale: 2 })
  fitScore: number;

  @Column({ type: 'text' })
  reasoning: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  decision: ShortlistDecision;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
