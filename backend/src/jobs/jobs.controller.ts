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
    @Body('recruiter_id') recruiterId: string,
    @Body('title') title: string,
  ): Promise<JobDescription> {
    // Default recruiter_id for now (auth guard will inject this in task 13)
    const rid = recruiterId ?? '00000000-0000-0000-0000-000000000000';
    const jobTitle = title ?? 'Untitled Position';
    return this.jobsService.uploadAndParse(file, rid, jobTitle);
  }

  @Get(':id')
  async getJob(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<JobDescription> {
    return this.jobsService.findById(id);
  }

  @Get(':id/criteria')
  async getCriteria(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ScreeningCriteria> {
    return this.jobsService.getCriteria(id);
  }

  @Put(':id/criteria')
  async saveCriteria(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCriteriaDto,
  ): Promise<ScreeningCriteria> {
    return this.jobsService.saveCriteria(id, dto);
  }
}
