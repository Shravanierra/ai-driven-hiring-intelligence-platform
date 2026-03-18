import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';

export type JobStatus = 'pending' | 'parsed' | 'error';

@Entity('job_descriptions')
export class JobDescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recruiter_id', type: 'uuid' })
  recruiterId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ name: 'raw_text', type: 'text', nullable: true })
  rawText: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 1000, nullable: true })
  fileUrl: string | null;

  @Column({ name: 'parsed_at', type: 'timestamptz', nullable: true })
  parsedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: JobStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
