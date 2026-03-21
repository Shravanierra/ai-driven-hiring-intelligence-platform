import { LlmClient } from '../llm/llm.client';
import { Skill } from '../entities/candidate-profile.entity';
export declare class SkillExtractorService {
    private readonly llmClient;
    private readonly logger;
    constructor(llmClient: LlmClient);
    extractSkills(resumeText: string): Promise<Skill[]>;
}
