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
exports.InterviewKitController = void 0;
const common_1 = require("@nestjs/common");
const interview_kit_service_1 = require("./interview-kit.service");
const current_recruiter_decorator_1 = require("../auth/current-recruiter.decorator");
class UpdateInterviewKitDto {
}
const VALID_TYPES = ['behavioral', 'technical', 'gap'];
let InterviewKitController = class InterviewKitController {
    constructor(interviewKitService) {
        this.interviewKitService = interviewKitService;
    }
    async generateKit(jobId, candidateId, recruiter) {
        return this.interviewKitService.generateKit(jobId, candidateId, recruiter.recruiterId);
    }
    async getKit(jobId, candidateId, recruiter) {
        return this.interviewKitService.getKit(jobId, candidateId, recruiter.recruiterId);
    }
    async updateKit(jobId, candidateId, body, recruiter) {
        if (!Array.isArray(body.questions)) {
            throw new common_1.BadRequestException('questions must be an array');
        }
        for (const q of body.questions) {
            if (!VALID_TYPES.includes(q.type)) {
                throw new common_1.BadRequestException(`Invalid question type "${q.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
            }
            if (!q.text || q.text.trim().length === 0) {
                throw new common_1.BadRequestException('Each question must have a non-empty text field');
            }
            if (!q.rubric ||
                !q.rubric.strong?.trim() ||
                !q.rubric.adequate?.trim() ||
                !q.rubric.weak?.trim()) {
                throw new common_1.BadRequestException('Each question must have a rubric with non-empty strong, adequate, and weak fields');
            }
        }
        return this.interviewKitService.updateKit(jobId, candidateId, body.questions, recruiter.recruiterId);
    }
    async exportKit(jobId, candidateId, res, recruiter) {
        const pdfBuffer = await this.interviewKitService.exportKitPdf(jobId, candidateId, recruiter.recruiterId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="interview-kit-${candidateId}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        res.end(pdfBuffer);
    }
};
exports.InterviewKitController = InterviewKitController;
__decorate([
    (0, common_1.Post)(':job_id/candidates/:candidate_id/interview-kit'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], InterviewKitController.prototype, "generateKit", null);
__decorate([
    (0, common_1.Get)(':job_id/candidates/:candidate_id/interview-kit'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], InterviewKitController.prototype, "getKit", null);
__decorate([
    (0, common_1.Put)(':job_id/candidates/:candidate_id/interview-kit'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateInterviewKitDto, Object]),
    __metadata("design:returntype", Promise)
], InterviewKitController.prototype, "updateKit", null);
__decorate([
    (0, common_1.Get)(':job_id/candidates/:candidate_id/interview-kit/export'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], InterviewKitController.prototype, "exportKit", null);
exports.InterviewKitController = InterviewKitController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [interview_kit_service_1.InterviewKitService])
], InterviewKitController);
//# sourceMappingURL=interview-kit.controller.js.map