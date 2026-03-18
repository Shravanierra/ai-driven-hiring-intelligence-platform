import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';

export interface CustomCriterion {
  label: string;
  weight: number;
  description: string;
}

@Entity('screening_criteria')
@Index(['jobId', 'version'], { unique: true })
export class ScreeningCriteria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'required_skills', type: 'jsonb', default: '[]' })
  requiredSkills: string[];

  @Column({ name: 'preferred_skills', type: 'jsonb', default: '[]' })
  preferredSkills: string[];

  @Column({ name: 'experience_level', type: 'varchar', length: 20 })
  experienceLevel: ExperienceLevel;

  @Column({ type: 'jsonb', default: '[]' })
  responsibilities: string[];

  @Column({ name: 'custom_criteria', type: 'jsonb', default: '[]' })
  customCriteria: CustomCriterion[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
