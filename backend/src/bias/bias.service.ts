import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiasFlag, BiasSeverity } from '../entities/bias-flag.entity';
import { FitScore, ScoreBreakdownItem } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';

export interface BiasReport {
  jobId: string;
  candidateCount: number;
  scoreDistribution: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stddev: number;
  };
  flaggedSignals: Array<{
    signal_type: string;
    count: number;
    severity: BiasSeverity;
    affected_criteria: string[];
  }>;
  totalFlags: number;
}

// Known Ivy League and elite institution patterns that may serve as demographic proxies
const IVY_LEAGUE_PATTERNS = [
  'harvard', 'yale', 'princeton', 'columbia', 'penn', 'dartmouth', 'brown', 'cornell',
  'mit', 'stanford', 'caltech', 'duke', 'vanderbilt', 'notre dame', 'georgetown',
];

// HBCUs that may be used as demographic proxies
const HBCU_PATTERNS = [
  'howard', 'spelman', 'morehouse', 'fisk', 'hampton', 'tuskegee', 'xavier',
  'florida a&m', 'north carolina a&t', 'prairie view', 'grambling',
];

// Graduation year range that implies age (e.g., graduated before 1990 implies 50+)
const GRADUATION_YEAR_OLD_THRESHOLD = new Date().getFullYear() - 35; // implies ~55+ years old
const GRADUATION_YEAR_RECENT_THRESHOLD = new Date().getFullYear() - 2; // very recent grad

// Name patterns that may correlate with demographics (common non-Western name indicators)
// These are checked in criterion explanations, not used for scoring
const NAME_PROXY_PATTERNS = [
  /\b(mr|mrs|ms|dr)\b/i,
];

interface DetectedSignal {
  signal_type: string;
  description: string;
  affected_criterion: string | null;
  severity: BiasSeverity;
}

@Injectable()
export class BiasService {
  private readonly logger = new Logger(BiasService.name);

  constructor(
    @InjectRepository(BiasFlag)
    private readonly biasFlagRepo: Repository<BiasFlag>,
    @InjectRepository(FitScore)
    private readonly fitScoreRepo: Repository<FitScore>,
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
  ) {}

  async getBiasFlags(jobId: string, candidateId: string, recruiterId?: string): Promise<BiasFlag[]> {
    await this.validateJobAndCandidate(jobId, candidateId, recruiterId);

    const fitScore = await this.fitScoreRepo.findOne({ where: { candidateId, jobId } });
    if (!fitScore) {
      // No score yet — return empty flags
      return [];
    }

    const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
    if (!profile) {
      throw new NotFoundException(`Candidate "${candidateId}" not found`);
    }

    // Detect signals from the score breakdown and candidate profile
    const signals = this.detectSignals(fitScore.breakdown, profile);

    // Delete existing flags for this candidate+job and re-persist fresh ones
    await this.biasFlagRepo.delete({ candidateId, jobId });

    if (signals.length === 0) {
      return [];
    }

    const flags = signals.map((s) =>
      this.biasFlagRepo.create({
        candidateId,
        jobId,
        signalType: s.signal_type,
        description: s.description,
        affectedCriterion: s.affected_criterion,
        severity: s.severity,
      }),
    );

    return this.biasFlagRepo.save(flags);
  }

  async getBiasReport(jobId: string, recruiterId?: string): Promise<BiasReport> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${jobId}" not found`);
    }
    if (recruiterId && job.recruiterId !== recruiterId) {
      throw new ForbiddenException(`You do not have access to job "${jobId}"`);
    }

    const profiles = await this.profileRepo.find({ where: { jobId } });
    const candidateCount = profiles.length;

    // Compute bias flags for all candidates with scores
    const allFlags: BiasFlag[] = [];
    const scores: number[] = [];

    for (const profile of profiles) {
      const fitScore = await this.fitScoreRepo.findOne({
        where: { candidateId: profile.id, jobId },
      });
      if (!fitScore || fitScore.status === 'error') continue;

      scores.push(Number(fitScore.score));

      const signals = this.detectSignals(fitScore.breakdown, profile);
      for (const s of signals) {
        allFlags.push(
          this.biasFlagRepo.create({
            candidateId: profile.id,
            jobId,
            signalType: s.signal_type,
            description: s.description,
            affectedCriterion: s.affected_criterion,
            severity: s.severity,
          }),
        );
      }
    }

    const scoreDistribution = this.computeDistribution(scores);
    const flaggedSignals = this.aggregateFlags(allFlags);

    return {
      jobId,
      candidateCount,
      scoreDistribution,
      flaggedSignals,
      totalFlags: allFlags.length,
    };
  }

  // Core detection logic — pure function, no DB access
  detectSignals(breakdown: ScoreBreakdownItem[], profile: CandidateProfile): DetectedSignal[] {
    const signals: DetectedSignal[] = [];

    // 1. Check education for institution name proxy signals
    for (const edu of profile.education) {
      const institutionLower = edu.institution.toLowerCase();

      const isIvy = IVY_LEAGUE_PATTERNS.some((p) => institutionLower.includes(p));
      if (isIvy) {
        signals.push({
          signal_type: 'institution_prestige_proxy',
          description: `Education at "${edu.institution}" may serve as a demographic proxy for socioeconomic background or legacy admissions bias.`,
          affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
          severity: 'medium',
        });
      }

      const isHBCU = HBCU_PATTERNS.some((p) => institutionLower.includes(p));
      if (isHBCU) {
        signals.push({
          signal_type: 'institution_demographic_proxy',
          description: `Education at "${edu.institution}" (HBCU) may serve as a demographic proxy for race/ethnicity.`,
          affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
          severity: 'high',
        });
      }

      // 2. Graduation year implying age
      if (edu.graduation_year !== null) {
        if (edu.graduation_year <= GRADUATION_YEAR_OLD_THRESHOLD) {
          signals.push({
            signal_type: 'graduation_year_age_proxy',
            description: `Graduation year ${edu.graduation_year} may imply candidate age (55+), which is a protected attribute.`,
            affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
            severity: 'high',
          });
        } else if (edu.graduation_year >= GRADUATION_YEAR_RECENT_THRESHOLD) {
          signals.push({
            signal_type: 'graduation_year_age_proxy',
            description: `Graduation year ${edu.graduation_year} may imply candidate is a recent graduate, potentially signaling age.`,
            affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
            severity: 'low',
          });
        }
      }
    }

    // 3. Check criterion explanations for name patterns (name should never appear in scoring)
    for (const item of breakdown) {
      const explanationLower = item.explanation.toLowerCase();
      const nameInExplanation = NAME_PROXY_PATTERNS.some((p) => p.test(item.explanation));
      if (nameInExplanation) {
        signals.push({
          signal_type: 'name_in_criterion_explanation',
          description: `Criterion "${item.criterion_label}" explanation contains a name-related pattern, which may indicate name bias in scoring.`,
          affected_criterion: item.criterion_label,
          severity: 'high',
        });
      }

      // Check if candidate name appears verbatim in any criterion explanation
      if (profile.name && profile.name.trim().length > 0) {
        const nameParts = profile.name.trim().split(/\s+/).filter((p) => p.length > 2);
        const nameFoundInExplanation = nameParts.some((part) =>
          explanationLower.includes(part.toLowerCase()),
        );
        if (nameFoundInExplanation) {
          signals.push({
            signal_type: 'name_in_criterion_explanation',
            description: `Candidate name appears in criterion "${item.criterion_label}" explanation, which may indicate name-based scoring bias.`,
            affected_criterion: item.criterion_label,
            severity: 'high',
          });
        }
      }
    }

    // 4. Check work experience for company name proxies (e.g., religious or culturally-specific orgs)
    for (const exp of profile.workExperience) {
      const companyLower = exp.company.toLowerCase();
      if (
        companyLower.includes('church') ||
        companyLower.includes('mosque') ||
        companyLower.includes('synagogue') ||
        companyLower.includes('temple')
      ) {
        signals.push({
          signal_type: 'religious_organization_proxy',
          description: `Work experience at "${exp.company}" may serve as a proxy for religious affiliation, a protected attribute.`,
          affected_criterion: this.findAffectedCriterion(breakdown, 'experience'),
          severity: 'medium',
        });
      }
    }

    // Deduplicate signals with same type + affected_criterion
    return this.deduplicateSignals(signals);
  }

  private findAffectedCriterion(breakdown: ScoreBreakdownItem[], keyword: string): string | null {
    const match = breakdown.find((item) =>
      item.criterion_label.toLowerCase().includes(keyword),
    );
    return match ? match.criterion_label : null;
  }

  private deduplicateSignals(signals: DetectedSignal[]): DetectedSignal[] {
    const seen = new Set<string>();
    return signals.filter((s) => {
      const key = `${s.signal_type}::${s.affected_criterion ?? ''}::${s.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private computeDistribution(scores: number[]): BiasReport['scoreDistribution'] {
    if (scores.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, stddev: 0 };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;

    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    const variance =
      scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
    const stddev = Math.sqrt(variance);

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stddev: Math.round(stddev * 100) / 100,
    };
  }

  private aggregateFlags(
    flags: BiasFlag[],
  ): BiasReport['flaggedSignals'] {
    const map = new Map<
      string,
      { count: number; severity: BiasSeverity; affected_criteria: Set<string> }
    >();

    for (const flag of flags) {
      const existing = map.get(flag.signalType);
      if (existing) {
        existing.count++;
        if (flag.affectedCriterion) existing.affected_criteria.add(flag.affectedCriterion);
        // Escalate severity if higher
        if (this.severityRank(flag.severity) > this.severityRank(existing.severity)) {
          existing.severity = flag.severity;
        }
      } else {
        map.set(flag.signalType, {
          count: 1,
          severity: flag.severity,
          affected_criteria: new Set(flag.affectedCriterion ? [flag.affectedCriterion] : []),
        });
      }
    }

    return Array.from(map.entries()).map(([signal_type, data]) => ({
      signal_type,
      count: data.count,
      severity: data.severity,
      affected_criteria: Array.from(data.affected_criteria),
    }));
  }

  private severityRank(s: BiasSeverity): number {
    return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
  }

  private async validateJobAndCandidate(jobId: string, candidateId: string, recruiterId?: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job description with id "${jobId}" not found`);
    }
    if (recruiterId && job.recruiterId !== recruiterId) {
      throw new ForbiddenException(`You do not have access to job "${jobId}"`);
    }

    const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
    if (!profile) {
      throw new NotFoundException(`Candidate with id "${candidateId}" not found`);
    }
    if (profile.jobId !== jobId) {
      throw new NotFoundException(`Candidate "${candidateId}" does not belong to job "${jobId}"`);
    }
  }
}
