import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantSession } from '../entities/assistant-session.entity';
import { CurrentRecruiter } from '../auth/current-recruiter.decorator';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';

class QueryDto {
  query: string;
}

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<AssistantSession> {
    return this.assistantService.createSession(recruiter.recruiterId);
  }

  @Post('sessions/:id/query')
  @HttpCode(HttpStatus.OK)
  async query(
    @Param('id', new ParseUUIDPipe()) sessionId: string,
    @Body() body: QueryDto,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<unknown> {
    return this.assistantService.query(sessionId, recruiter.recruiterId, body.query);
  }

  @Get('sessions/:id')
  async getSession(
    @Param('id', new ParseUUIDPipe()) sessionId: string,
    @CurrentRecruiter() recruiter: AuthenticatedRecruiter,
  ): Promise<AssistantSession> {
    return this.assistantService.getSession(sessionId, recruiter.recruiterId);
  }
}
