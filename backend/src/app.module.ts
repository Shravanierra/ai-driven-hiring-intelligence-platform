import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config';
import { LlmModule } from './llm/llm.module';
import { JobsModule } from './jobs/jobs.module';
import { ResumesModule } from './resumes/resumes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    LlmModule,
    JobsModule,
    ResumesModule,
  ],
})
export class AppModule {}
