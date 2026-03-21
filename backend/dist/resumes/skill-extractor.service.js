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
var SkillExtractorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillExtractorService = void 0;
const common_1 = require("@nestjs/common");
const llm_client_1 = require("../llm/llm.client");
let SkillExtractorService = SkillExtractorService_1 = class SkillExtractorService {
    constructor(llmClient) {
        this.llmClient = llmClient;
        this.logger = new common_1.Logger(SkillExtractorService_1.name);
    }
    async extractSkills(resumeText) {
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
        const result = await this.llmClient.createChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: resumeText },
        ], { responseFormat: 'json_object', temperature: 0.1 });
        let data;
        try {
            data = JSON.parse(result.content);
        }
        catch {
            this.logger.warn('SkillExtractor: LLM returned invalid JSON, returning empty skills');
            return [];
        }
        if (!Array.isArray(data.skills)) {
            this.logger.warn('SkillExtractor: LLM response missing skills array, returning empty');
            return [];
        }
        return data.skills
            .filter((s) => typeof s.canonical_name === 'string' &&
            s.canonical_name.trim().length > 0 &&
            Array.isArray(s.raw_aliases))
            .map((s) => ({
            canonical_name: s.canonical_name.trim(),
            raw_aliases: s.raw_aliases
                .filter((a) => typeof a === 'string')
                .map((a) => a.trim()),
        }));
    }
};
exports.SkillExtractorService = SkillExtractorService;
exports.SkillExtractorService = SkillExtractorService = SkillExtractorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_client_1.LlmClient])
], SkillExtractorService);
//# sourceMappingURL=skill-extractor.service.js.map