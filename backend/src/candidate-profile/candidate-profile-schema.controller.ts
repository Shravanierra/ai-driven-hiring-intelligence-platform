import { Controller, Get } from '@nestjs/common';
import { CANDIDATE_PROFILE_V1_SCHEMA } from './candidate-profile.serializer';
import { Public } from '../auth/public.decorator';

@Controller('schema')
export class CandidateProfileSchemaController {
  @Public()
  @Get('candidate-profile')
  getSchema() {
    return CANDIDATE_PROFILE_V1_SCHEMA;
  }
}
