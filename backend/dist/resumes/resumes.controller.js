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
exports.ResumesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const resumes_service_1 = require("./resumes.service");
const current_recruiter_decorator_1 = require("../auth/current-recruiter.decorator");
const MAX_FILES = 500;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
let ResumesController = class ResumesController {
    constructor(resumesService) {
        this.resumesService = resumesService;
    }
    async uploadResumes(jobId, files, recruiter) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('At least one file must be provided');
        }
        return this.resumesService.uploadBatch(jobId, files, recruiter.recruiterId);
    }
    async listCandidates(jobId, recruiter) {
        return this.resumesService.listCandidates(jobId, recruiter.recruiterId);
    }
    async getCandidate(candidateId, recruiter) {
        return this.resumesService.getCandidate(candidateId, recruiter.recruiterId);
    }
};
exports.ResumesController = ResumesController;
__decorate([
    (0, common_1.Post)('jobs/:job_id/resumes'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', MAX_FILES, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: MAX_FILE_SIZE },
    })),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], ResumesController.prototype, "uploadResumes", null);
__decorate([
    (0, common_1.Get)('jobs/:job_id/candidates'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ResumesController.prototype, "listCandidates", null);
__decorate([
    (0, common_1.Get)('candidates/:candidate_id'),
    __param(0, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ResumesController.prototype, "getCandidate", null);
exports.ResumesController = ResumesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [resumes_service_1.ResumesService])
], ResumesController);
//# sourceMappingURL=resumes.controller.js.map