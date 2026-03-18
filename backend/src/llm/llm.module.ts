import { Module, Global } from '@nestjs/common';
import { LlmClient } from './llm.client';

@Global()
@Module({
  providers: [LlmClient],
  exports: [LlmClient],
})
export class LlmModule {}
