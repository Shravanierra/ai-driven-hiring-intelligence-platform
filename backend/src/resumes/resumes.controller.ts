import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFiles,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ResumesService, ResumeUploadResult } from './resumes.service';

const MAX_FILES = 500;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per file

@Controller()
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  /**
   * POST /jobs/:job_id/resumes
   * Accepts multipart/form-data with up to 500 resume files.
   * Returns { profiles: [...], failures: [...] }
   */
  @Post('jobs/:job_id/resumes')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadResumes(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ResumeUploadResult> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }
    return this.resumesService.uploadBatch(jobId, files);
  }

  /**
   * GET /jobs/:job_id/candidates
   * Returns all candidate profiles for a job.
   */
  @Get('jobs/:job_id/candidates')
  async listCandidates(
    @Param('job_id', new ParseUUIDPipe()) jobId: string,
  ): Promise<object[]> {
    return this.resumesService.listCandidates(jobId);
  }

  /**
   * GET /candidates/:candidate_id
   * Returns a single candidate profile.
   */
  @Get('candidates/:candidate_id')
  async getCandidate(
    @Param('candidate_id', new ParseUUIDPipe()) candidateId: string,
  ): Promise<object> {
    return this.resumesService.getCandidate(candidateId);
  }
}
