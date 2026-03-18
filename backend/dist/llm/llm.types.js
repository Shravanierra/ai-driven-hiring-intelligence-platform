"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiServiceUnavailableError = void 0;
class AiServiceUnavailableError extends Error {
    constructor(message = 'AI service is unavailable after retries') {
        super(message);
        this.statusCode = 503;
        this.errorCode = 'ai_service_unavailable';
        this.name = 'AiServiceUnavailableError';
    }
}
exports.AiServiceUnavailableError = AiServiceUnavailableError;
//# sourceMappingURL=llm.types.js.map