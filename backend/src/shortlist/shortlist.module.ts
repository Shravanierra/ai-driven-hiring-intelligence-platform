import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShortlistEntry } from '../entities/shortlist-entry.entity';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { ShortlistController } from './shortlist.controller';
import { ShortlistService } from './shortlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShortlistEntry, FitScore, CandidateProfile, JobDescription]),
  ],
  controllers: [ShortlistController],
  providers: [ShortlistService],
  exports: [ShortlistService],
})
export class ShortlistModule {}
