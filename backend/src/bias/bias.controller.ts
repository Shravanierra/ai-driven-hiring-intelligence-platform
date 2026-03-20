import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { BiasService, BiasReport } from './bias.service';
import { BiasFlag } from '../entities/bias-flag.entity';
import { CurrentRecruiter } from '../auth/current-recruiter.decorator';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';

@Controller('jobs')
export class BiasController {
  constructor(private readonly biasService: BiasService) {}

  @Get(':job_id/candidates/:candidate_id/bias')
  async getBiasFlags(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<BiasFlag[]> {
    return this.biasService.getBiasFlags(jobId, candidateId, recruiter.recruiterId);
  }

  @Get(':job_id/bias-report')
  async getBiasReport(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<BiasReport> {
    return this.biasService.getBiasReport(jobId, recruiter.recruiterId);
  }
}
