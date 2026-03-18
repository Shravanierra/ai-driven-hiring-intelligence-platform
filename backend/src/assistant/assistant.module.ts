import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantSession } from '../entities/assistant-session.entity';
import { JobDescription } from '../entities/job-description.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { FitScore } from '../entities/fit-score.entity';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssistantSession,
      JobDescription,
      CandidateProfile,
      FitScore,
    ]),
  ],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
