import { Controller, Post, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { FitScore } from '../entities/fit-score.entity';
import { CurrentRecruiter } from '../auth/current-recruiter.decorator';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';

@Controller('jobs')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post(':job_id/candidates/:candidate_id/score')
  async computeScore(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<FitScore> {
    return this.scoringService.computeScore(jobId, candidateId, recruiter.recruiterId);
  }

  @Get(':job_id/candidates/:candidate_id/score')
  async getScore(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<FitScore> {
    return this.scoringService.getScore(jobId, candidateId, recruiter.recruiterId);
  }

  @Post(':job_id/rescore')
  async rescoreAll(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<{ rescored: number; failed: number; errors: Array<{ candidateId: string; error: string }> }> {
    return this.scoringService.rescoreAll(jobId, recruiter.recruiterId);
  }
}
