import { Injectable, Logger } from '@nestjs/common';
import { LlmClient } from '../llm/llm.client';
import {
  CandidateProfile,
  WorkExperience,
  Education,
  Skill,
} from '../entities/candidate-profile.entity';

@Injectable()
export class SummaryGeneratorService {
  private readonly logger = new Logger(SummaryGeneratorService.name);

  constructor(private readonly llmClient: LlmClient) {}

  /**
   * Generate a human-readable summary of a candidate's background, key skills,
   * and experience level. Returns a non-empty string; falls back to a
   * constructed summary if the LLM returns an empty response.
   */
  async generateSummary(profile: {
    name: string;
    skills: Skill[];
    workExperience: WorkExperience[];
    education: Education[];
  }): Promise<string> {
    const profileText = this.buildProfileText(profile);

    const systemPrompt = `You are an expert HR assistant. Given a candidate's structured profile data, write a concise 2-3 sentence human-readable summary of their background, key skills, and experience level. The summary should be professional, factual, and highlight the most relevant aspects of the candidate's profile. Return only the summary text, no labels or extra formatting.`;

    try {
      const result = await this.llmClient.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: profileText },
        ],
        { temperature: 0.3 },
      );

      const summary = result.content.trim();
      if (summary.length > 0) {
        return summary;
      }

      this.logger.warn(
        `SummaryGenerator: LLM returned empty summary for "${profile.name}", using fallback`,
      );
    } catch (err) {
      this.logger.warn(
        `SummaryGenerator: LLM call failed for "${profile.name}", using fallback: ${(err as Error).message}`,
      );
    }

    return this.buildFallbackSummary(profile);
  }

  private buildProfileText(profile: {
    name: string;
    skills: Skill[];
    workExperience: WorkExperience[];
    education: Education[];
  }): string {
    const lines: string[] = [`Candidate: ${profile.name}`];

    if (profile.skills.length > 0) {
      const skillNames = profile.skills.map((s) => s.canonical_name).join(', ');
      lines.push(`Skills: ${skillNames}`);
    }

    if (profile.workExperience.length > 0) {
      lines.push('Work Experience:');
      for (const exp of profile.workExperience) {
        const end = exp.end_date ?? 'Present';
        lines.push(`  - ${exp.title} at ${exp.company} (${exp.start_date} – ${end})`);
        if (exp.description) {
          lines.push(`    ${exp.description}`);
        }
      }
    }

    if (profile.education.length > 0) {
      lines.push('Education:');
      for (const edu of profile.education) {
        const year = edu.graduation_year ? ` (${edu.graduation_year})` : '';
        lines.push(`  - ${edu.degree} in ${edu.field} from ${edu.institution}${year}`);
      }
    }

    return lines.join('\n');
  }

  private buildFallbackSummary(profile: {
    name: string;
    skills: Skill[];
    workExperience: WorkExperience[];
    education: Education[];
  }): string {
    const parts: string[] = [];

    if (profile.workExperience.length > 0) {
      const latest = profile.workExperience[0];
      parts.push(`${profile.name} is a ${latest.title} with experience at ${latest.company}.`);
    } else {
      parts.push(`${profile.name} is a candidate with a professional background.`);
    }

    if (profile.skills.length > 0) {
      const topSkills = profile.skills
        .slice(0, 5)
        .map((s) => s.canonical_name)
        .join(', ');
      parts.push(`Key skills include ${topSkills}.`);
    }

    if (profile.education.length > 0) {
      const edu = profile.education[0];
      parts.push(`Holds a ${edu.degree} in ${edu.field} from ${edu.institution}.`);
    }

    return parts.join(' ');
  }
}
