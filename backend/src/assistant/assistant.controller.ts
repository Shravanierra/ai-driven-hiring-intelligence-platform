import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantSession } from '../entities/assistant-session.entity';

class CreateSessionDto {
  recruiterId: string;
}

class QueryDto {
  query: string;
  recruiterId: string;
}

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() body: CreateSessionDto): Promise<AssistantSession> {
    return this.assistantService.createSession(body.recruiterId);
  }

  @Post('sessions/:id/query')
  @HttpCode(HttpStatus.OK)
  async query(
    @Param('id', new ParseUUIDPipe()) sessionId: string,
    @Body() body: QueryDto,
  ): Promise<unknown> {
    return this.assistantService.query(sessionId, body.recruiterId, body.query);
  }

  @Get('sessions/:id')
  async getSession(
    @Param('id', new ParseUUIDPipe()) sessionId: string,
    @Body() body: { recruiterId?: string },
  ): Promise<AssistantSession> {
    return this.assistantService.getSession(sessionId, body.recruiterId);
  }
}
