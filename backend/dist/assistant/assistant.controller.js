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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const assistant_service_1 = require("./assistant.service");
const current_recruiter_decorator_1 = require("../auth/current-recruiter.decorator");
class QueryDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], QueryDto.prototype, "query", void 0);
let AssistantController = class AssistantController {
    constructor(assistantService) {
        this.assistantService = assistantService;
    }
    async createSession(recruiter) {
        return this.assistantService.createSession(recruiter.recruiterId);
    }
    async query(sessionId, body, recruiter) {
        return this.assistantService.query(sessionId, recruiter.recruiterId, body.query);
    }
    async getSession(sessionId, recruiter) {
        return this.assistantService.getSession(sessionId, recruiter.recruiterId);
    }
};
exports.AssistantController = AssistantController;
__decorate([
    (0, common_1.Post)('sessions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AssistantController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)('sessions/:id/query'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, QueryDto, Object]),
    __metadata("design:returntype", Promise)
], AssistantController.prototype, "query", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AssistantController.prototype, "getSession", null);
exports.AssistantController = AssistantController = __decorate([
    (0, common_1.Controller)('assistant'),
    __metadata("design:paramtypes", [assistant_service_1.AssistantService])
], AssistantController);
//# sourceMappingURL=assistant.controller.js.map