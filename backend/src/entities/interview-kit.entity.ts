import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type QuestionType = 'behavioral' | 'technical' | 'gap';

export interface QuestionRubric {
  strong: string;
  adequate: string;
  weak: string;
}

export interface InterviewQuestion {
  id: string;
  type: QuestionType;
  text: string;
  rubric: QuestionRubric;
}

@Entity('interview_kits')
@Index(['candidateId', 'jobId'])
export class InterviewKit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ type: 'jsonb', default: '[]' })
  questions: InterviewQuestion[];

  @CreateDateColumn({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
