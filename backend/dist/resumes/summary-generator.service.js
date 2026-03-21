"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SummaryGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const llm_client_1 = require("../llm/llm.client");
let SummaryGeneratorService = SummaryGeneratorService_1 = class SummaryGeneratorService {
    constructor(llmClient) {
        this.llmClient = llmClient;
        this.logger = new common_1.Logger(SummaryGeneratorService_1.name);
    }
    async generateSummary(profile) {
        const profileText = this.buildProfileText(profile);
        const systemPrompt = `You are an expert HR assistant. Given a candidate's structured profile data, write a concise 2-3 sentence human-readable summary of their background, key skills, and experience level. The summary should be professional, factual, and highlight the most relevant aspects of the candidate's profile. Return only the summary text, no labels or extra formatting.`;
        try {
            const result = await this.llmClient.createChatCompletion([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: profileText },
            ], { temperature: 0.3 });
            const summary = result.content.trim();
            if (summary.length > 0) {
                return summary;
            }
            this.logger.warn(`SummaryGenerator: LLM returned empty summary for "${profile.name}", using fallback`);
        }
        catch (err) {
            this.logger.warn(`SummaryGenerator: LLM call failed for "${profile.name}", using fallback: ${err.message}`);
        }
        return this.buildFallbackSummary(profile);
    }
    buildProfileText(profile) {
        const lines = [`Candidate: ${profile.name}`];
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
    buildFallbackSummary(profile) {
        const parts = [];
        if (profile.workExperience.length > 0) {
            const latest = profile.workExperience[0];
            parts.push(`${profile.name} is a ${latest.title} with experience at ${latest.company}.`);
        }
        else {
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
};
exports.SummaryGeneratorService = SummaryGeneratorService;
exports.SummaryGeneratorService = SummaryGeneratorService = SummaryGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_client_1.LlmClient])
], SummaryGeneratorService);
//# sourceMappingURL=summary-generator.service.js.map