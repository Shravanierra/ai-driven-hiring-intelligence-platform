import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FitScore, ScoreBreakdownItem, CriterionStatus, FitScoreStatus } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria, CustomCriterion } from '../entities/screening-criteria.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';

interface CriterionDescriptor {
  label: string;
  text: string;
  weight: number;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectRepository(FitScore)
    private readonly fitScoreRepo: Repository<FitScore>,
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(ScreeningCriteria)
    private readonly criteriaRepo: Repository<ScreeningCriteria>,
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
    private readonly llmClient: LlmClient,
  ) {}

  async computeScore(jobId: string, candidateId: string): Promise<FitScore> {
    // Verify job exists
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${jobId}" not found`);
    }

    // Verify candidate exists and belongs to this job
    const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
    if (!profile) {
      throw new NotFoundException(`Candidate with id "${candidateId}" not found`);
    }
    if (profile.jobId !== jobId) {
      throw new NotFoundException(`Candidate "${candidateId}" does not belong to job "${jobId}"`);
    }

    // Get latest screening criteria
    const criteria = await this.criteriaRepo.findOne({
      where: { jobId },
      order: { version: 'DESC' },
    });
    if (!criteria) {
      throw new NotFoundException(`Screening criteria for job "${jobId}" not found`);
    }

    // Build candidate profile text
    const candidateText = this.buildCandidateText(profile);

    // Build criterion descriptors
    const criterionDescriptors = this.buildCriterionDescriptors(criteria);

    // Generate candidate embedding
    const candidateEmbeddingResult = await this.llmClient.createEmbedding(candidateText);
    const candidateEmbedding = candidateEmbeddingResult.embedding;

    // Generate embeddings for each criterion and compute similarity
    const breakdown: ScoreBreakdownItem[] = [];
    const totalWeight = criterionDescriptors.reduce((sum, c) => sum + c.weight, 0);

    for (const criterion of criterionDescriptors) {
      const criterionEmbeddingResult = await this.llmClient.createEmbedding(criterion.text);
      const similarity = this.cosineSimilarity(candidateEmbedding, criterionEmbeddingResult.embedding);

      const status = this.similarityToStatus(similarity);
      const normalizedWeight = totalWeight > 0 ? criterion.weight / totalWeight : 1 / criterionDescriptors.length;
      const contribution = similarity * normalizedWeight * 100;

      breakdown.push({
        criterion_label: criterion.label,
        status,
        contribution: Math.round(contribution * 100) / 100,
        explanation: this.buildExplanation(criterion.label, status, similarity),
      });
    }

    // Overall score = sum of contributions (already scaled to 0-100 via normalized weights)
    const rawScore = breakdown.reduce((sum, item) => sum + item.contribution, 0);
    const score = Math.min(100, Math.max(0, Math.round(rawScore * 100) / 100));

    // Upsert FitScore (replace existing if present)
    const existing = await this.fitScoreRepo.findOne({
      where: { candidateId, jobId },
    });

    if (existing) {
      existing.criteriaVersion = criteria.version;
      existing.score = score;
      existing.breakdown = breakdown;
      existing.status = 'ok';
      return this.fitScoreRepo.save(existing);
    }

    const fitScore = this.fitScoreRepo.create({
      candidateId,
      jobId,
      criteriaVersion: criteria.version,
      score,
      breakdown,
      status: 'ok',
    });
    return this.fitScoreRepo.save(fitScore);
  }

  async getScore(jobId: string, candidateId: string): Promise<FitScore> {
    // Verify job exists
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${jobId}" not found`);
    }

    // Verify candidate exists and belongs to this job
    const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
    if (!profile) {
      throw new NotFoundException(`Candidate with id "${candidateId}" not found`);
    }
    if (profile.jobId !== jobId) {
      throw new NotFoundException(`Candidate "${candidateId}" does not belong to job "${jobId}"`);
    }

    const fitScore = await this.fitScoreRepo.findOne({
      where: { candidateId, jobId },
    });
    if (!fitScore) {
      throw new NotFoundException(
        `No fit score found for candidate "${candidateId}" and job "${jobId}". Trigger scoring first via POST.`,
      );
    }
    return fitScore;
  }

  async rescoreAll(jobId: string): Promise<{ rescored: number; failed: number; errors: Array<{ candidateId: string; error: string }> }> {
    const profiles = await this.profileRepo.find({ where: { jobId } });

    const results = await Promise.allSettled(
      profiles.map((profile) => this.computeScore(jobId, profile.id)),
    );

    let rescored = 0;
    let failed = 0;
    const errors: Array<{ candidateId: string; error: string }> = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const profile = profiles[i];

      if (result.status === 'fulfilled') {
        rescored++;
      } else {
        failed++;
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push({ candidateId: profile.id, error: errorMessage });

        // Mark the FitScore record with status='error'
        try {
          const existing = await this.fitScoreRepo.findOne({
            where: { candidateId: profile.id, jobId },
          });
          if (existing) {
            existing.status = 'error';
            await this.fitScoreRepo.save(existing);
          } else {
            const errRecord = this.fitScoreRepo.create({
              candidateId: profile.id,
              jobId,
              criteriaVersion: 0,
              score: 0,
              breakdown: [],
              status: 'error',
            });
            await this.fitScoreRepo.save(errRecord);
          }
        } catch (saveErr) {
          this.logger.error(
            `Failed to persist error status for candidate ${profile.id}: ${(saveErr as Error).message}`,
          );
        }
      }
    }

    this.logger.log(`rescoreAll for job ${jobId}: rescored=${rescored}, failed=${failed}`);
    return { rescored, failed, errors };
  }

  private buildCandidateText(profile: CandidateProfile): string {
    const parts: string[] = [];

    if (profile.summary) {
      parts.push(`Summary: ${profile.summary}`);
    }

    if (profile.skills.length > 0) {
      const skillNames = profile.skills.map((s) => s.canonical_name).join(', ');
      parts.push(`Skills: ${skillNames}`);
    }

    if (profile.workExperience.length > 0) {
      const expParts = profile.workExperience.map(
        (w) => `${w.title} at ${w.company} (${w.start_date} - ${w.end_date ?? 'present'}): ${w.description}`,
      );
      parts.push(`Work Experience: ${expParts.join('; ')}`);
    }

    if (profile.education.length > 0) {
      const eduParts = profile.education.map(
        (e) => `${e.degree} in ${e.field} from ${e.institution}`,
      );
      parts.push(`Education: ${eduParts.join('; ')}`);
    }

    return parts.join('\n') || profile.name;
  }

  private buildCriterionDescriptors(criteria: ScreeningCriteria): CriterionDescriptor[] {
    const descriptors: CriterionDescriptor[] = [];

    if (criteria.requiredSkills.length > 0) {
      descriptors.push({
        label: 'Required Skills',
        text: `Required skills: ${criteria.requiredSkills.join(', ')}`,
        weight: 1.0,
      });
    }

    if (criteria.preferredSkills.length > 0) {
      descriptors.push({
        label: 'Preferred Skills',
        text: `Preferred skills: ${criteria.preferredSkills.join(', ')}`,
        weight: 0.5,
      });
    }

    if (criteria.experienceLevel) {
      descriptors.push({
        label: 'Experience Level',
        text: `Experience level required: ${criteria.experienceLevel}`,
        weight: 0.75,
      });
    }

    if (criteria.responsibilities.length > 0) {
      descriptors.push({
        label: 'Responsibilities',
        text: `Role responsibilities: ${criteria.responsibilities.join('; ')}`,
        weight: 0.75,
      });
    }

    for (const custom of criteria.customCriteria) {
      descriptors.push({
        label: custom.label,
        text: `${custom.label}: ${custom.description}`,
        weight: custom.weight > 0 ? custom.weight : 0.5,
      });
    }

    // Fallback: if no criteria defined, create a generic one
    if (descriptors.length === 0) {
      descriptors.push({
        label: 'General Fit',
        text: 'General candidate fit for the role',
        weight: 1.0,
      });
    }

    return descriptors;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;

    return dot / denom;
  }

  private similarityToStatus(similarity: number): CriterionStatus {
    if (similarity >= 0.8) return 'met';
    if (similarity >= 0.5) return 'partial';
    return 'not_met';
  }

  private buildExplanation(label: string, status: CriterionStatus, similarity: number): string {
    const pct = Math.round(similarity * 100);
    switch (status) {
      case 'met':
        return `Candidate strongly matches "${label}" (${pct}% semantic similarity).`;
      case 'partial':
        return `Candidate partially matches "${label}" (${pct}% semantic similarity).`;
      case 'not_met':
        return `Candidate does not sufficiently match "${label}" (${pct}% semantic similarity).`;
    }
  }
}
