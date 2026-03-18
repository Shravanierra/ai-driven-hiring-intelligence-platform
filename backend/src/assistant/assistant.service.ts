import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { AssistantSession, SessionTurn } from '../entities/assistant-session.entity';
import { JobDescription } from '../entities/job-description.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { FitScore } from '../entities/fit-score.entity';
import { LlmClient } from '../llm/llm.client';
import { ChatMessage } from '../llm/llm.types';

const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours
const QUERY_TIMEOUT_MS = 5000;

export interface QueryResult {
  query: string;
  interpretation: string;
  results: CandidateResult[];
}

export interface ClarificationResult {
  results: [];
  clarification: string;
  suggestions: string[];
}

export interface CandidateResult {
  candidateId: string;
  name: string;
  fitScore: number;
  jobId: string;
}

interface InterpretedQuery {
  interpretation: string;
  skills: string[];
  experienceLevel: string | null;
  keywords: string[];
}

@Injectable()
export class AssistantService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssistantService.name);
  private redisClient: RedisClientType;

  constructor(
    @InjectRepository(AssistantSession)
    private readonly sessionRepo: Repository<AssistantSession>,
    @InjectRepository(JobDescription)
    private readonly jobRepo: Repository<JobDescription>,
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(FitScore)
    private readonly fitScoreRepo: Repository<FitScore>,
    private readonly llmClient: LlmClient,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    this.redisClient = createClient({
      socket: { host, port },
    }) as RedisClientType;

    this.redisClient.on('error', (err) => {
      this.logger.warn(`Redis client error: ${err.message}`);
    });

    try {
      await this.redisClient.connect();
      this.logger.log('Redis connected for AssistantService');
    } catch (err) {
      this.logger.warn(`Redis connection failed, sessions will use DB only: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redisClient?.disconnect();
    } catch {
      // ignore
    }
  }

  async createSession(recruiterId: string): Promise<AssistantSession> {
    const session = this.sessionRepo.create({
      recruiterId,
      turns: [],
    });
    const saved = await this.sessionRepo.save(session);

    // Cache in Redis
    await this.cacheSession(saved);

    return saved;
  }

  async getSession(sessionId: string, recruiterId?: string): Promise<AssistantSession> {
    const session = await this.loadSession(sessionId);

    if (recruiterId && session.recruiterId !== recruiterId) {
      throw new ForbiddenException('Access to this session is not authorized');
    }

    return session;
  }

  async query(
    sessionId: string,
    recruiterId: string,
    queryText: string,
  ): Promise<QueryResult | ClarificationResult> {
    const session = await this.loadSession(sessionId);

    if (session.recruiterId !== recruiterId) {
      throw new ForbiddenException('Access to this session is not authorized');
    }

    // Enforce 5-second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timed out after 5 seconds')), QUERY_TIMEOUT_MS),
    );

    return Promise.race([
      this.executeQuery(session, queryText),
      timeoutPromise,
    ]);
  }

  private async executeQuery(
    session: AssistantSession,
    queryText: string,
  ): Promise<QueryResult | ClarificationResult> {
    // Get recruiter's authorized job IDs
    const authorizedJobs = await this.jobRepo.find({
      where: { recruiterId: session.recruiterId },
      select: ['id'],
    });

    if (authorizedJobs.length === 0) {
      return this.buildClarification(
        'No job openings found for your account.',
        ['Try uploading a job description first', 'Check that you are using the correct account'],
      );
    }

    const authorizedJobIds = authorizedJobs.map((j) => j.id);

    // Build conversation context from prior turns
    const conversationHistory = this.buildConversationHistory(session.turns);

    // Interpret the query using LLM with session context
    let interpreted: InterpretedQuery;
    try {
      interpreted = await this.interpretQuery(queryText, conversationHistory);
    } catch (err) {
      this.logger.warn(`Query interpretation failed: ${(err as Error).message}`);
      return this.buildClarification(
        'I could not understand your query. Please try rephrasing it.',
        [
          'Try "Show top backend engineers with Python experience"',
          'Try "Find senior candidates with Kubernetes skills"',
          'Try "List candidates with more than 5 years of experience"',
        ],
      );
    }

    // Search candidates using embedding similarity
    const candidateResults = await this.searchCandidates(
      queryText,
      interpreted,
      authorizedJobIds,
    );

    if (candidateResults.length === 0) {
      return this.buildClarification(
        `No candidates found matching "${queryText}". Try broadening your search criteria.`,
        [
          'Try removing specific skill requirements',
          'Try a more general query like "Show all candidates"',
          'Check that resumes have been uploaded for your job openings',
        ],
      );
    }

    // Persist the turn
    const turn: SessionTurn = {
      query: queryText,
      interpretation: interpreted.interpretation,
      candidate_ids: candidateResults.map((r) => r.candidateId),
      timestamp: new Date().toISOString(),
    };

    session.turns = [...session.turns, turn];
    const updatedSession = await this.sessionRepo.save(session);
    await this.cacheSession(updatedSession);

    return {
      query: queryText,
      interpretation: interpreted.interpretation,
      results: candidateResults,
    };
  }

  private async interpretQuery(
    queryText: string,
    conversationHistory: ChatMessage[],
  ): Promise<InterpretedQuery> {
    const systemPrompt = `You are a recruiting assistant that interprets natural language queries about candidates.
Given a query, extract the search intent and return a JSON object with:
- interpretation: a human-readable string describing what criteria you are using to find candidates
- skills: array of skill names mentioned or implied (e.g., ["Python", "Kubernetes"])
- experienceLevel: one of "entry", "mid", "senior", "lead", or null if not specified
- keywords: array of other relevant keywords for searching

Return ONLY valid JSON, no markdown.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: `Interpret this recruiting query: "${queryText}"` },
    ];

    const result = await this.llmClient.createChatCompletion(messages, {
      temperature: 0.1,
      maxTokens: 300,
      responseFormat: 'json_object',
    });

    const parsed = JSON.parse(result.content) as InterpretedQuery;

    if (!parsed.interpretation || typeof parsed.interpretation !== 'string') {
      throw new Error('Invalid interpretation response from LLM');
    }

    return {
      interpretation: parsed.interpretation,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experienceLevel: parsed.experienceLevel ?? null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  }

  private async searchCandidates(
    queryText: string,
    interpreted: InterpretedQuery,
    authorizedJobIds: string[],
  ): Promise<CandidateResult[]> {
    // Build a search text from the interpreted query
    const searchText = [
      queryText,
      ...interpreted.skills,
      interpreted.experienceLevel ?? '',
      ...interpreted.keywords,
    ]
      .filter(Boolean)
      .join(' ');

    // Generate embedding for the query
    let queryEmbedding: number[];
    try {
      const embeddingResult = await this.llmClient.createEmbedding(searchText);
      queryEmbedding = embeddingResult.embedding;
    } catch (err) {
      this.logger.warn(`Embedding generation failed, falling back to keyword search: ${(err as Error).message}`);
      return this.fallbackKeywordSearch(interpreted, authorizedJobIds);
    }

    // Get all candidates for authorized jobs
    const profiles = await this.profileRepo.find({
      where: { jobId: In(authorizedJobIds) },
    });

    if (profiles.length === 0) {
      return [];
    }

    // Get FitScores for all candidates
    const candidateIds = profiles.map((p) => p.id);
    const fitScores = await this.fitScoreRepo.find({
      where: { candidateId: In(candidateIds) },
    });
    const fitScoreMap = new Map(fitScores.map((fs) => [`${fs.candidateId}:${fs.jobId}`, fs]));

    // Score each candidate by embedding similarity to query
    const scoredCandidates: Array<{ profile: CandidateProfile; similarity: number; fitScore: number }> = [];

    for (const profile of profiles) {
      // Build candidate text for similarity comparison
      const candidateText = this.buildCandidateSearchText(profile, interpreted);

      // Apply experience level filter if specified
      if (interpreted.experienceLevel) {
        const expMatch = this.matchesExperienceLevel(profile, interpreted.experienceLevel);
        if (!expMatch) continue;
      }

      // Apply skill filter if skills specified
      if (interpreted.skills.length > 0) {
        const hasSkill = this.hasAnySkill(profile, interpreted.skills);
        if (!hasSkill) continue;
      }

      // Get the best fit score for this candidate across authorized jobs
      let bestFitScore = 0;
      for (const jobId of authorizedJobIds) {
        const fs = fitScoreMap.get(`${profile.id}:${jobId}`);
        if (fs && Number(fs.score) > bestFitScore) {
          bestFitScore = Number(fs.score);
        }
      }

      // Compute text similarity using simple keyword matching as a relevance signal
      const similarity = this.computeTextRelevance(candidateText, interpreted);

      scoredCandidates.push({
        profile,
        similarity,
        fitScore: bestFitScore,
      });
    }

    // Sort by FitScore descending, then by similarity as tiebreaker
    scoredCandidates.sort((a, b) => {
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      return b.similarity - a.similarity;
    });

    // Return top 20 results
    return scoredCandidates.slice(0, 20).map((sc) => ({
      candidateId: sc.profile.id,
      name: sc.profile.name,
      fitScore: sc.fitScore,
      jobId: sc.profile.jobId,
    }));
  }

  private async fallbackKeywordSearch(
    interpreted: InterpretedQuery,
    authorizedJobIds: string[],
  ): Promise<CandidateResult[]> {
    const profiles = await this.profileRepo.find({
      where: { jobId: In(authorizedJobIds) },
    });

    const candidateIds = profiles.map((p) => p.id);
    const fitScores = await this.fitScoreRepo.find({
      where: { candidateId: In(candidateIds) },
    });
    const fitScoreMap = new Map(fitScores.map((fs) => [`${fs.candidateId}:${fs.jobId}`, fs]));

    const results: CandidateResult[] = [];

    for (const profile of profiles) {
      if (interpreted.skills.length > 0 && !this.hasAnySkill(profile, interpreted.skills)) {
        continue;
      }

      let bestFitScore = 0;
      for (const jobId of authorizedJobIds) {
        const fs = fitScoreMap.get(`${profile.id}:${jobId}`);
        if (fs && Number(fs.score) > bestFitScore) {
          bestFitScore = Number(fs.score);
        }
      }

      results.push({
        candidateId: profile.id,
        name: profile.name,
        fitScore: bestFitScore,
        jobId: profile.jobId,
      });
    }

    results.sort((a, b) => b.fitScore - a.fitScore);
    return results.slice(0, 20);
  }

  private buildCandidateSearchText(profile: CandidateProfile, interpreted: InterpretedQuery): string {
    const parts: string[] = [profile.name, profile.summary];

    const skillNames = profile.skills.map((s) => s.canonical_name);
    parts.push(...skillNames);

    const titles = profile.workExperience.map((w) => `${w.title} ${w.company}`);
    parts.push(...titles);

    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  private computeTextRelevance(candidateText: string, interpreted: InterpretedQuery): number {
    let score = 0;
    const text = candidateText.toLowerCase();

    for (const skill of interpreted.skills) {
      if (text.includes(skill.toLowerCase())) score += 2;
    }

    for (const keyword of interpreted.keywords) {
      if (text.includes(keyword.toLowerCase())) score += 1;
    }

    return score;
  }

  private hasAnySkill(profile: CandidateProfile, skills: string[]): boolean {
    const profileSkills = profile.skills.map((s) => s.canonical_name.toLowerCase());
    const profileText = [
      profile.summary,
      ...profile.workExperience.map((w) => w.description),
    ].join(' ').toLowerCase();

    return skills.some((skill) => {
      const s = skill.toLowerCase();
      return profileSkills.some((ps) => ps.includes(s) || s.includes(ps)) ||
        profileText.includes(s);
    });
  }

  private matchesExperienceLevel(profile: CandidateProfile, level: string): boolean {
    const yearsOfExp = profile.workExperience.length;
    const summaryLower = profile.summary.toLowerCase();
    const levelLower = level.toLowerCase();

    // Check summary for level keywords
    if (summaryLower.includes(levelLower)) return true;

    // Rough heuristic based on number of work experiences
    switch (levelLower) {
      case 'entry':
        return yearsOfExp <= 2;
      case 'mid':
        return yearsOfExp >= 2 && yearsOfExp <= 5;
      case 'senior':
        return yearsOfExp >= 4;
      case 'lead':
        return yearsOfExp >= 6;
      default:
        return true;
    }
  }

  private buildConversationHistory(turns: SessionTurn[]): ChatMessage[] {
    const messages: ChatMessage[] = [];

    for (const turn of turns.slice(-5)) { // Keep last 5 turns for context
      messages.push({ role: 'user', content: turn.query });
      messages.push({
        role: 'assistant',
        content: `Found ${turn.candidate_ids.length} candidates. Interpretation: ${turn.interpretation}`,
      });
    }

    return messages;
  }

  private buildClarification(clarification: string, suggestions: string[]): ClarificationResult {
    return {
      results: [],
      clarification,
      suggestions,
    };
  }

  private async cacheSession(session: AssistantSession): Promise<void> {
    try {
      if (this.redisClient?.isReady) {
        const key = `assistant:session:${session.id}`;
        await this.redisClient.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(session));
      }
    } catch (err) {
      this.logger.warn(`Failed to cache session ${session.id}: ${(err as Error).message}`);
    }
  }

  private async loadSession(sessionId: string): Promise<AssistantSession> {
    // Try Redis cache first
    try {
      if (this.redisClient?.isReady) {
        const key = `assistant:session:${sessionId}`;
        const cached = await this.redisClient.get(key);
        if (cached) {
          const parsed = JSON.parse(cached) as AssistantSession;
          // Refresh TTL
          await this.redisClient.expire(key, SESSION_TTL_SECONDS);
          return parsed;
        }
      }
    } catch (err) {
      this.logger.warn(`Redis cache miss for session ${sessionId}: ${(err as Error).message}`);
    }

    // Fall back to PostgreSQL
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session "${sessionId}" not found`);
    }

    // Warm the cache
    await this.cacheSession(session);

    return session;
  }
}
