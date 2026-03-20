import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShortlistEntry, ShortlistDecision } from '../entities/shortlist-entry.entity';
import { FitScore } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';

export interface ShortlistFilters {
  minExperience?: number;
  requiredSkill?: string;
}

@Injectable()
export class ShortlistService {
  private readonly logger = new Logger(ShortlistService.name);

  constructor(
    @InjectRepository(ShortlistEntry)
    private readonly shortlistRepo: Repository<ShortlistEntry>,
    @InjectRepository(FitScore)
    private readonly fitScoreRepo: Repository<FitScore>,
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
    private readonly llmClient: LlmClient,
  ) {}

  async generateShortlist(
    jobId: string,
    size: number,
    filters?: ShortlistFilters,
    recruiterId?: string,
  ): Promise<ShortlistEntry[]> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    if (size < 1 || size > 50) {
      throw new BadRequestException('size must be between 1 and 50');
    }

    // Fetch all FitScore records for the job
    const fitScores = await this.fitScoreRepo.find({ where: { jobId } });
    if (fitScores.length === 0) {
      throw new NotFoundException(`No fit scores found for job "${jobId}"`);
    }

    // Load candidate profiles for filtering
    const candidateIds = fitScores.map((fs) => fs.candidateId);
    const profiles = await this.profileRepo.findByIds(candidateIds);
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Apply filters
    let filtered = fitScores.filter((fs) => {
      const profile = profileMap.get(fs.candidateId);
      if (!profile) return false;

      if (filters?.minExperience !== undefined) {
        if (profile.workExperience.length < filters.minExperience) return false;
      }

      if (filters?.requiredSkill) {
        const skill = filters.requiredSkill.toLowerCase();
        const hasSkill = profile.skills.some(
          (s) => s.canonical_name.toLowerCase() === skill,
        );
        if (!hasSkill) return false;
      }

      return true;
    });

    // Sort by score descending, take top N
    filtered.sort((a, b) => Number(b.score) - Number(a.score));
    const topN = filtered.slice(0, size);

    // Generate reasoning and persist entries
    const entries: ShortlistEntry[] = [];

    for (let i = 0; i < topN.length; i++) {
      const fs = topN[i];
      const rank = i + 1;
      const reasoning = await this.generateReasoning(fs, rank);

      // Upsert by job_id + candidate_id
      let entry = await this.shortlistRepo.findOne({
        where: { jobId, candidateId: fs.candidateId },
      });

      if (entry) {
        entry.rank = rank;
        entry.fitScore = Number(fs.score);
        entry.reasoning = reasoning;
        entry.decision = 'pending';
      } else {
        entry = this.shortlistRepo.create({
          jobId,
          candidateId: fs.candidateId,
          rank,
          fitScore: Number(fs.score),
          reasoning,
          decision: 'pending',
        });
      }

      entries.push(await this.shortlistRepo.save(entry));
    }

    return entries.sort((a, b) => a.rank - b.rank);
  }

  async getShortlist(jobId: string, recruiterId?: string): Promise<ShortlistEntry[]> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    return this.shortlistRepo.find({
      where: { jobId },
      order: { rank: 'ASC' },
    });
  }

  async updateDecision(
    jobId: string,
    candidateId: string,
    decision: ShortlistDecision,
    recruiterId?: string,
  ): Promise<ShortlistEntry> {
    if (recruiterId) {
      const job = await this.jobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException(`Job description with id "${jobId}" not found`);
      }
      if (job.recruiterId !== recruiterId) {
        throw new ForbiddenException(`You do not have access to job "${jobId}"`);
      }
    }
    const entry = await this.shortlistRepo.findOne({ where: { jobId, candidateId } });
    if (!entry) {
      throw new NotFoundException(
        `Shortlist entry not found for job "${jobId}" and candidate "${candidateId}"`,
      );
    }
    entry.decision = decision;
    entry.decidedAt = new Date();
    return this.shortlistRepo.save(entry);
  }

  private async generateReasoning(fs: FitScore, rank: number): Promise<string> {
    const breakdownSummary = fs.breakdown
      .map((b) => `${b.criterion_label}: ${b.status} (${b.contribution.toFixed(1)} pts)`)
      .join(', ');

    const prompt = `Given this candidate's fit score of ${Number(fs.score).toFixed(1)} and breakdown (${breakdownSummary}), explain in 1-2 sentences why they rank at position ${rank} for this job.`;

    try {
      const result = await this.llmClient.createChatCompletion([
        { role: 'system', content: 'You are a hiring assistant. Be concise and factual.' },
        { role: 'user', content: prompt },
      ], { maxTokens: 100, temperature: 0.3 });

      return result.content.trim();
    } catch (err) {
      this.logger.warn(
        `LLM reasoning failed for candidate ${fs.candidateId}: ${(err as Error).message}`,
      );
      return `Ranked based on fit score of ${Number(fs.score).toFixed(1)}`;
    }
  }
}
