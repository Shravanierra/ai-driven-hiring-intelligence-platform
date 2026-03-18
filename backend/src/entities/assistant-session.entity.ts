import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface SessionTurn {
  query: string;
  interpretation: string;
  candidate_ids: string[];
  timestamp: string;
}

@Entity('assistant_sessions')
@Index(['recruiterId'])
export class AssistantSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recruiter_id', type: 'uuid' })
  recruiterId: string;

  @Column({ type: 'jsonb', default: '[]' })
  turns: SessionTurn[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
