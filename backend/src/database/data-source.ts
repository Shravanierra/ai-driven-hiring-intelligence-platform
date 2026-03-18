import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { FitScore } from '../entities/fit-score.entity';
import { ShortlistEntry } from '../entities/shortlist-entry.entity';
import { BiasFlag } from '../entities/bias-flag.entity';
import { InterviewKit } from '../entities/interview-kit.entity';
import { AssistantSession } from '../entities/assistant-session.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'hiring',
  password: process.env.DB_PASSWORD ?? 'hiring_secret',
  database: process.env.DB_DATABASE ?? 'hiring_platform',
  entities: [
    JobDescription,
    ScreeningCriteria,
    CandidateProfile,
    FitScore,
    ShortlistEntry,
    BiasFlag,
    InterviewKit,
    AssistantSession,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
