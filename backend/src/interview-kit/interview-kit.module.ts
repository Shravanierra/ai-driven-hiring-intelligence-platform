import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewKit } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { JobDescription } from '../entities/job-description.entity';
import { InterviewKitController } from './interview-kit.controller';
import { InterviewKitService } from './interview-kit.service';
import { InterviewKitPdfService } from './interview-kit-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterviewKit, CandidateProfile, ScreeningCriteria, JobDescription]),
  ],
  controllers: [InterviewKitController],
  providers: [InterviewKitService, InterviewKitPdfService],
  exports: [InterviewKitService],
})
export class InterviewKitModule {}
