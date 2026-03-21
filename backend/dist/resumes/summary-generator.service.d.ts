import { LlmClient } from '../llm/llm.client';
import { WorkExperience, Education, Skill } from '../entities/candidate-profile.entity';
export declare class SummaryGeneratorService {
    private readonly llmClient;
    private readonly logger;
    constructor(llmClient: LlmClient);
    generateSummary(profile: {
        name: string;
        skills: Skill[];
        workExperience: WorkExperience[];
        education: Education[];
    }): Promise<string>;
    private buildProfileText;
    private buildFallbackSummary;
}
