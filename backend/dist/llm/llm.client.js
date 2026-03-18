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
var LlmClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
const llm_types_1 = require("./llm.types");
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const CHAT_MODEL = 'gpt-4o';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
let LlmClient = LlmClient_1 = class LlmClient {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(LlmClient_1.name);
        this.openai = new openai_1.default({
            apiKey: this.config.get('OPENAI_API_KEY'),
        });
    }
    async createEmbedding(text) {
        return this.withRetry(async () => {
            const response = await this.openai.embeddings.create({
                model: EMBEDDING_MODEL,
                input: text,
            });
            return {
                embedding: response.data[0].embedding,
                model: response.model,
                usage: {
                    prompt_tokens: response.usage.prompt_tokens,
                    total_tokens: response.usage.total_tokens,
                },
            };
        });
    }
    async createChatCompletion(messages, options = {}) {
        return this.withRetry(async () => {
            const response = await this.openai.chat.completions.create({
                model: CHAT_MODEL,
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens,
                response_format: options.responseFormat === 'json_object'
                    ? { type: 'json_object' }
                    : { type: 'text' },
            });
            const choice = response.choices[0];
            return {
                content: choice.message.content ?? '',
                model: response.model,
                usage: {
                    prompt_tokens: response.usage?.prompt_tokens ?? 0,
                    completion_tokens: response.usage?.completion_tokens ?? 0,
                    total_tokens: response.usage?.total_tokens ?? 0,
                },
            };
        });
    }
    async withRetry(operation) {
        let lastError;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                this.logger.warn(`LLM call failed (attempt ${attempt}/${MAX_RETRIES}): ${lastError.message}`);
                if (attempt < MAX_RETRIES) {
                    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    await this.sleep(delayMs);
                }
            }
        }
        this.logger.error(`LLM call exhausted all ${MAX_RETRIES} retries. Last error: ${lastError?.message}`);
        throw new llm_types_1.AiServiceUnavailableError();
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.LlmClient = LlmClient;
exports.LlmClient = LlmClient = LlmClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LlmClient);
//# sourceMappingURL=llm.client.js.map