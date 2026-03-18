import { Controller, Post, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { FitScore } from '../entities/fit-score.entity';

@Controller('jobs')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post(':job_id/candidates/:candidate_id/score')
  async computeScore(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
  ): Promise<FitScore> {
    return this.scoringService.computeScore(jobId, candidateId);
  }

  @Get(':job_id/candidates/:candidate_id/score')
  async getScore(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
  ): Promise<FitScore> {
    return this.scoringService.getScore(jobId, candidateId);
  }

  @Post(':job_id/rescore')
  async rescoreAll(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
  ): Promise<{ rescored: number; failed: number; errors: Array<{ candidateId: string; error: string }> }> {
    return this.scoringService.rescoreAll(jobId);
  }
}
