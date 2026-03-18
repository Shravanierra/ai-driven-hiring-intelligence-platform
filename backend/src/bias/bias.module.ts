import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiasFlag } from '../entities/bias-flag.entity';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { BiasController } from './bias.controller';
import { BiasService } from './bias.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BiasFlag, FitScore, CandidateProfile, JobDescription]),
  ],
  controllers: [BiasController],
  providers: [BiasService],
  exports: [BiasService],
})
export class BiasModule {}
