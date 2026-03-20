import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { InterviewKit, InterviewQuestion, QuestionType } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
import { AiServiceUnavailableError } from '../llm/llm.types';
import { InterviewKitPdfService } from './interview-kit-pdf.service';

interface LlmQuestion {
  type: QuestionType;
  text: string;
  rubric: {
    strong: string;
    adequate: string;
    weak: string;
  };
}

@Injectable()
export class InterviewKitService {
  private readonly logger = new Logger(InterviewKitService.name);

  constructor(
    @InjectRepository(InterviewKit)
    private readonly kitRepo: Repository<InterviewKit>,
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(ScreeningCriteria)
    private readonly criteriaRepo: Repository<ScreeningCriteria>,
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
    private readonly llmClient: LlmClient,
    private readonly pdfService: InterviewKitPdfService,
  ) {}

  async generateKit(jobId: string, candidateId: string, recruiterId?: string): Promise<InterviewKit> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    const profile = await this.profileRepo.findOne({
      where: { id: candidateId, jobId },
    });
    if (!profile) {
      throw new NotFoundException(
        `Candidate profile not found for candidate "${candidateId}" and job "${jobId}"`,
      );
    }

    const criteria = await this.criteriaRepo.findOne({ where: { jobId } });
    if (!criteria) {
      throw new NotFoundException(`Screening criteria not found for job "${jobId}"`);
    }

    const questions = await this.callLlmForQuestions(profile, criteria);

    // Upsert: if a kit already exists for this candidate+job, replace it
    let kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
    if (kit) {
      kit.questions = questions;
    } else {
      kit = this.kitRepo.create({ candidateId, jobId, questions });
    }

    return this.kitRepo.save(kit);
  }

  async getKit(jobId: string, candidateId: string, recruiterId?: string): Promise<InterviewKit> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    const kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
    if (!kit) {
      throw new NotFoundException(
        `Interview kit not found for candidate "${candidateId}" and job "${jobId}"`,
      );
    }
    return kit;
  }

  async updateKit(
    jobId: string,
    candidateId: string,
    questions: InterviewQuestion[],
    recruiterId?: string,
  ): Promise<InterviewKit> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    const kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
    if (!kit) {
      throw new NotFoundException(
        `Interview kit not found for candidate "${candidateId}" and job "${jobId}"`,
      );
    }
    kit.questions = questions;
    return this.kitRepo.save(kit);
  }

  async exportKitPdf(jobId: string, candidateId: string, recruiterId?: string): Promise<Buffer> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    const kit = await this.kitRepo.findOne({ where: { candidateId, jobId } });
    if (!kit) {
      throw new NotFoundException(
        `Interview kit not found for candidate "${candidateId}" and job "${jobId}"`,
      );
    }

    const profile = await this.profileRepo.findOne({ where: { id: candidateId, jobId } });
    if (!profile) {
      throw new NotFoundException(
        `Candidate profile not found for candidate "${candidateId}" and job "${jobId}"`,
      );
    }

    return this.pdfService.generatePdf(kit, profile);
  }

  private async callLlmForQuestions(
    profile: CandidateProfile,
    criteria: ScreeningCriteria,
  ): Promise<InterviewQuestion[]> {
    const systemPrompt = `You are an expert technical interviewer. Generate interview questions based on the candidate profile and job screening criteria provided. Return a JSON object with a "questions" array. Each question must have: "type" (one of: behavioral, technical, gap), "text" (the question), and "rubric" with "strong", "adequate", and "weak" fields describing what a strong/adequate/weak answer looks like. Generate between 5 and 15 questions. You MUST include at least one behavioral question, at least one technical question, and at least one gap question. All rubric fields must be non-empty.`;

    const userPrompt = `Candidate Profile:
Name: ${profile.name}
Summary: ${profile.summary}
Skills: ${profile.skills.map((s) => s.canonical_name).join(', ')}
Work Experience: ${profile.workExperience.map((w) => `${w.title} at ${w.company} (${w.start_date} - ${w.end_date ?? 'present'}): ${w.description}`).join('\n')}
Education: ${profile.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`).join(', ')}

Screening Criteria:
Required Skills: ${criteria.requiredSkills.join(', ')}
Preferred Skills: ${criteria.preferredSkills.join(', ')}
Experience Level: ${criteria.experienceLevel}
Responsibilities: ${criteria.responsibilities.join('; ')}
Custom Criteria: ${criteria.customCriteria.map((c) => `${c.label}: ${c.description}`).join('; ')}

Generate interview questions as a JSON object with a "questions" array.`;

    try {
      const result = await this.llmClient.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { responseFormat: 'json_object', temperature: 0.4, maxTokens: 3000 },
      );

      return this.parseAndValidateQuestions(result.content);
    } catch (err) {
      if (err instanceof AiServiceUnavailableError) {
        throw new ServiceUnavailableException('AI service is unavailable. Please try again later.');
      }
      this.logger.error(`LLM call failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Failed to generate interview questions.');
    }
  }

  private parseAndValidateQuestions(content: string): InterviewQuestion[] {
    let parsed: { questions: LlmQuestion[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ServiceUnavailableException('Failed to parse LLM response as JSON.');
    }

    if (!Array.isArray(parsed.questions)) {
      throw new ServiceUnavailableException('LLM response missing "questions" array.');
    }

    const validTypes: QuestionType[] = ['behavioral', 'technical', 'gap'];
    const questions: InterviewQuestion[] = parsed.questions
      .filter((q) => {
        return (
          validTypes.includes(q.type) &&
          typeof q.text === 'string' &&
          q.text.trim().length > 0 &&
          q.rubric &&
          typeof q.rubric.strong === 'string' && q.rubric.strong.trim().length > 0 &&
          typeof q.rubric.adequate === 'string' && q.rubric.adequate.trim().length > 0 &&
          typeof q.rubric.weak === 'string' && q.rubric.weak.trim().length > 0
        );
      })
      .map((q) => ({
        id: uuidv4(),
        type: q.type,
        text: q.text.trim(),
        rubric: {
          strong: q.rubric.strong.trim(),
          adequate: q.rubric.adequate.trim(),
          weak: q.rubric.weak.trim(),
        },
      }));

    // Enforce count bounds
    if (questions.length < 5 || questions.length > 15) {
      throw new ServiceUnavailableException(
        `LLM returned ${questions.length} valid questions; expected 5–15.`,
      );
    }

    // Enforce at least one of each required type
    const types = new Set(questions.map((q) => q.type));
    for (const required of ['behavioral', 'technical', 'gap'] as QuestionType[]) {
      if (!types.has(required)) {
        throw new ServiceUnavailableException(
          `LLM response missing at least one "${required}" question.`,
        );
      }
    }

    return questions;
  }
}
