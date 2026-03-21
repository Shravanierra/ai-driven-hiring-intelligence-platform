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
exports.ScoringController = void 0;
const common_1 = require("@nestjs/common");
const scoring_service_1 = require("./scoring.service");
const current_recruiter_decorator_1 = require("../auth/current-recruiter.decorator");
let ScoringController = class ScoringController {
    constructor(scoringService) {
        this.scoringService = scoringService;
    }
    async computeScore(jobId, candidateId, recruiter) {
        return this.scoringService.computeScore(jobId, candidateId, recruiter.recruiterId);
    }
    async getScore(jobId, candidateId, recruiter) {
        return this.scoringService.getScore(jobId, candidateId, recruiter.recruiterId);
    }
    async rescoreAll(jobId, recruiter) {
        return this.scoringService.rescoreAll(jobId, recruiter.recruiterId);
    }
};
exports.ScoringController = ScoringController;
__decorate([
    (0, common_1.Post)(':job_id/candidates/:candidate_id/score'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ScoringController.prototype, "computeScore", null);
__decorate([
    (0, common_1.Get)(':job_id/candidates/:candidate_id/score'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ScoringController.prototype, "getScore", null);
__decorate([
    (0, common_1.Post)(':job_id/rescore'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScoringController.prototype, "rescoreAll", null);
exports.ScoringController = ScoringController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [scoring_service_1.ScoringService])
], ScoringController);
//# sourceMappingURL=scoring.controller.js.map