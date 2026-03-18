import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { FitScore } from '../entities/fit-score.entity';
import { ShortlistEntry } from '../entities/shortlist-entry.entity';
import { BiasFlag } from '../entities/bias-flag.entity';
import { InterviewKit } from '../entities/interview-kit.entity';
import { AssistantSession } from '../entities/assistant-session.entity';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'hiring'),
    password: config.get<string>('DB_PASSWORD', 'hiring_secret'),
    database: config.get<string>('DB_DATABASE', 'hiring_platform'),
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
    synchronize: config.get<string>('NODE_ENV') !== 'production',
    logging: config.get<string>('NODE_ENV') === 'development',
  }),
};
