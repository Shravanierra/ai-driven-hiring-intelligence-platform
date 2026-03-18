import { Injectable, Logger } from '@nestjs/common';
import { LlmClient } from '../llm/llm.client';
import { Skill } from '../entities/candidate-profile.entity';

@Injectable()
export class SkillExtractorService {
  private readonly logger = new Logger(SkillExtractorService.name);

  constructor(private readonly llmClient: LlmClient) {}

  /**
   * Extract and normalize skills from resume text using LLM.
   * Maps aliases (e.g. "K8s") to canonical names (e.g. "Kubernetes").
   * Returns an array of { canonical_name, raw_aliases } objects.
   */
  async extractSkills(resumeText: string): Promise<Skill[]> {
    const systemPrompt = `You are an expert technical skill extractor. Given resume text, identify all technical and professional skills mentioned.

For each skill, normalize it to a canonical name and collect all aliases/variations found in the text.

Return ONLY valid JSON with this exact shape:
{
  "skills": [
    { "canonical_name": "string", "raw_aliases": ["string"] }
  ]
}

Normalization rules:
- "K8s", "k8s", "Kubernetes" → canonical_name: "Kubernetes", raw_aliases: all variants found
- "JS", "Javascript", "JavaScript" → canonical_name: "JavaScript", raw_aliases: all variants found
- "TS", "Typescript", "TypeScript" → canonical_name: "TypeScript", raw_aliases: all variants found
- "AWS", "Amazon Web Services" → canonical_name: "AWS", raw_aliases: all variants found
- "ML", "Machine Learning" → canonical_name: "Machine Learning", raw_aliases: all variants found
- "AI", "Artificial Intelligence" → canonical_name: "Artificial Intelligence", raw_aliases: all variants found
- "CI/CD", "CI CD", "Continuous Integration" → canonical_name: "CI/CD", raw_aliases: all variants found
- "Node", "NodeJS", "Node.js" → canonical_name: "Node.js", raw_aliases: all variants found
- "React", "ReactJS", "React.js" → canonical_name: "React", raw_aliases: all variants found
- For any skill with only one form found, raw_aliases should contain that one form
- canonical_name should be the most widely recognized, full form of the skill name

Return only the JSON object, no markdown, no explanation.`;

    const result = await this.llmClient.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: resumeText },
      ],
      { responseFormat: 'json_object', temperature: 0.1 },
    );

    let data: { skills?: unknown };
    try {
      data = JSON.parse(result.content);
    } catch {
      this.logger.warn('SkillExtractor: LLM returned invalid JSON, returning empty skills');
      return [];
    }

    if (!Array.isArray(data.skills)) {
      this.logger.warn('SkillExtractor: LLM response missing skills array, returning empty');
      return [];
    }

    return (data.skills as Array<Record<string, unknown>>)
      .filter(
        (s) =>
          typeof s.canonical_name === 'string' &&
          s.canonical_name.trim().length > 0 &&
          Array.isArray(s.raw_aliases),
      )
      .map((s) => ({
        canonical_name: (s.canonical_name as string).trim(),
        raw_aliases: (s.raw_aliases as unknown[])
          .filter((a) => typeof a === 'string')
          .map((a) => (a as string).trim()),
      }));
  }
}
