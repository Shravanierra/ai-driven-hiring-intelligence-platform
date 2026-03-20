import { Module } from '@nestjs/common';
import { CandidateProfileSchemaController } from './candidate-profile-schema.controller';

@Module({
  controllers: [CandidateProfileSchemaController],
})
export class CandidateProfileModule {}
