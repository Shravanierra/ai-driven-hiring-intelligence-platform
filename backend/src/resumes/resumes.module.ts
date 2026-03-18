import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { SkillExtractorService } from './skill-extractor.service';
import { SummaryGeneratorService } from './summary-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateProfile, JobDescription])],
  controllers: [ResumesController],
  providers: [ResumesService, SkillExtractorService, SummaryGeneratorService],
  exports: [ResumesService, SkillExtractorService, SummaryGeneratorService],
})
export class ResumesModule {}
