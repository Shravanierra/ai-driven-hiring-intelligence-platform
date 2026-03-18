import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ParseStatus = 'success' | 'error';

export interface ContactInfo {
  email: string;
  phone: string | null;
  location: string | null;
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduation_year: number | null;
}

export interface Skill {
  canonical_name: string;
  raw_aliases: string[];
}

@Entity('candidate_profiles')
@Index(['jobId'])
export class CandidateProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schema_version', type: 'varchar', length: 10, default: '1' })
  schemaVersion: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'jsonb' })
  contact: ContactInfo;

  @Column({ name: 'work_experience', type: 'jsonb', default: '[]' })
  workExperience: WorkExperience[];

  @Column({ type: 'jsonb', default: '[]' })
  education: Education[];

  @Column({ type: 'jsonb', default: '[]' })
  skills: Skill[];

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ name: 'parse_status', type: 'varchar', length: 20, default: 'success' })
  parseStatus: ParseStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 1000, nullable: true })
  fileUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
