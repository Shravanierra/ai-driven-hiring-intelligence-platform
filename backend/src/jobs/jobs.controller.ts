import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JobsService, UpdateCriteriaDto } from './jobs.service';
import { JobDescription } from '../entities/job-description.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { CurrentRecruiter } from '../auth/current-recruiter.decorator';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  )
  async createJob(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<JobDescription> {
    const jobTitle = title ?? 'Untitled Position';
    return this.jobsService.uploadAndParse(file, recruiter.recruiterId, jobTitle);
  }

  @Get(':id')
  async getJob(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<JobDescription> {
    return this.jobsService.findByIdForRecruiter(id, recruiter.recruiterId);
  }

  @Get(':id/criteria')
  async getCriteria(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<ScreeningCriteria> {
    await this.jobsService.findByIdForRecruiter(id, recruiter.recruiterId);
    return this.jobsService.getCriteria(id);
  }

  @Put(':id/criteria')
  async saveCriteria(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCriteriaDto,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<ScreeningCriteria> {
    await this.jobsService.findByIdForRecruiter(id, recruiter.recruiterId);
    return this.jobsService.saveCriteria(id, dto);
  }
}
