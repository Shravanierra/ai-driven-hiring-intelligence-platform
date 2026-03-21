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
exports.ShortlistController = void 0;
const common_1 = require("@nestjs/common");
const shortlist_service_1 = require("./shortlist.service");
const current_recruiter_decorator_1 = require("../auth/current-recruiter.decorator");
class GenerateShortlistDto {
}
class UpdateDecisionDto {
}
const ALLOWED_DECISIONS = ['accepted', 'rejected', 'deferred'];
let ShortlistController = class ShortlistController {
    constructor(shortlistService) {
        this.shortlistService = shortlistService;
    }
    async generateShortlist(jobId, body, recruiter) {
        return this.shortlistService.generateShortlist(jobId, body.size, body.filters, recruiter.recruiterId);
    }
    async getShortlist(jobId, recruiter) {
        return this.shortlistService.getShortlist(jobId, recruiter.recruiterId);
    }
    async updateDecision(jobId, candidateId, body, recruiter) {
        if (!ALLOWED_DECISIONS.includes(body.decision)) {
            throw new common_1.BadRequestException(`decision must be one of: ${ALLOWED_DECISIONS.join(', ')}`);
        }
        return this.shortlistService.updateDecision(jobId, candidateId, body.decision, recruiter.recruiterId);
    }
};
exports.ShortlistController = ShortlistController;
__decorate([
    (0, common_1.Post)(':job_id/shortlist'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, GenerateShortlistDto, Object]),
    __metadata("design:returntype", Promise)
], ShortlistController.prototype, "generateShortlist", null);
__decorate([
    (0, common_1.Get)(':job_id/shortlist'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShortlistController.prototype, "getShortlist", null);
__decorate([
    (0, common_1.Patch)(':job_id/shortlist/:candidate_id'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateDecisionDto, Object]),
    __metadata("design:returntype", Promise)
], ShortlistController.prototype, "updateDecision", null);
exports.ShortlistController = ShortlistController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [shortlist_service_1.ShortlistService])
], ShortlistController);
//# sourceMappingURL=shortlist.controller.js.map