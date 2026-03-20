import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InterviewKitService } from './interview-kit.service';
import { InterviewKit, InterviewQuestion, QuestionType } from '../entities/interview-kit.entity';
import { CurrentRecruiter } from '../auth/current-recruiter.decorator';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';

class UpdateInterviewKitDto {
  questions: InterviewQuestion[];
}

const VALID_TYPES: QuestionType[] = ['behavioral', 'technical', 'gap'];

@Controller('jobs')
export class InterviewKitController {
  constructor(private readonly interviewKitService: InterviewKitService) {}

  @Post(':job_id/candidates/:candidate_id/interview-kit')
  async generateKit(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<InterviewKit> {
    return this.interviewKitService.generateKit(jobId, candidateId, recruiter.recruiterId);
  }

  @Get(':job_id/candidates/:candidate_id/interview-kit')
  async getKit(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<InterviewKit> {
    return this.interviewKitService.getKit(jobId, candidateId, recruiter.recruiterId);
  }

  @Put(':job_id/candidates/:candidate_id/interview-kit')
  async updateKit(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @Body() body: UpdateInterviewKitDto,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<InterviewKit> {
    if (!Array.isArray(body.questions)) {
      throw new BadRequestException('questions must be an array');
    }

    for (const q of body.questions) {
      if (!VALID_TYPES.includes(q.type)) {
        throw new BadRequestException(
          `Invalid question type "${q.type}". Must be one of: ${VALID_TYPES.join(', ')}`,
        );
      }
      if (!q.text || q.text.trim().length === 0) {
        throw new BadRequestException('Each question must have a non-empty text field');
      }
      if (
        !q.rubric ||
        !q.rubric.strong?.trim() ||
        !q.rubric.adequate?.trim() ||
        !q.rubric.weak?.trim()
      ) {
        throw new BadRequestException(
          'Each question must have a rubric with non-empty strong, adequate, and weak fields',
        );
      }
    }

    return this.interviewKitService.updateKit(jobId, candidateId, body.questions, recruiter.recruiterId);
  }

  @Get(':job_id/candidates/:candidate_id/interview-kit/export')
  async exportKit(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
    @Res() res: Response,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<void> {
    const pdfBuffer = await this.interviewKitService.exportKitPdf(jobId, candidateId, recruiter.recruiterId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="interview-kit-${candidateId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
