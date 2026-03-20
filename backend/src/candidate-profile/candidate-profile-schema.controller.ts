import { Controller, Get } from '@nestjs/common';
import { CANDIDATE_PROFILE_V1_SCHEMA } from './candidate-profile.serializer';

@Controller('schema')
export class CandidateProfileSchemaController {
  @Get('candidate-profile')
  getSchema() {
    return CANDIDATE_PROFILE_V1_SCHEMA;
  }
}
