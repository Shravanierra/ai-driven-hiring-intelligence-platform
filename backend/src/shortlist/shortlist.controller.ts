import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ShortlistService, ShortlistFilters } from './shortlist.service';
import { ShortlistEntry, ShortlistDecision } from '../entities/shortlist-entry.entity';

class GenerateShortlistDto {
  size: number;
  filters?: ShortlistFilters;
}

class UpdateDecisionDto {
  decision: ShortlistDecision;
}

const ALLOWED_DECISIONS: ShortlistDecision[] = ['accepted', 'rejected', 'deferred'];

@Controller('jobs')
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  @Post(':job_id/shortlist')
  async generateShortlist(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Body() body: GenerateShortlistDto,
  ): Promise<ShortlistEntry[]> {
    return this.shortlistService.generateShortlist(jobId, body.size, body.filters);
  }

  @Get(':job_id/shortlist')
  async getShortlist(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
  ): Promise<ShortlistEntry[]> {
    return this.shortlistService.getShortlist(jobId);
  }

  @Patch(':job_id/shortlist/:candidate_id')
  async updateDecision(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @Body() body: UpdateDecisionDto,
  ): Promise<ShortlistEntry> {
    if (!ALLOWED_DECISIONS.includes(body.decision)) {
      throw new BadRequestException(
        `decision must be one of: ${ALLOWED_DECISIONS.join(', ')}`,
      );
    }
    return this.shortlistService.updateDecision(jobId, candidateId, body.decision);
  }
}
