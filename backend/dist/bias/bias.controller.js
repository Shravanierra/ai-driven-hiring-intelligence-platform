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
exports.BiasController = void 0;
const common_1 = require("@nestjs/common");
const bias_service_1 = require("./bias.service");
const current_recruiter_decorator_1 = require("../auth/current-recruiter.decorator");
let BiasController = class BiasController {
    constructor(biasService) {
        this.biasService = biasService;
    }
    async getBiasFlags(jobId, candidateId, recruiter) {
        return this.biasService.getBiasFlags(jobId, candidateId, recruiter.recruiterId);
    }
    async getBiasReport(jobId, recruiter) {
        return this.biasService.getBiasReport(jobId, recruiter.recruiterId);
    }
};
exports.BiasController = BiasController;
__decorate([
    (0, common_1.Get)(':job_id/candidates/:candidate_id/bias'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('candidate_id', new common_1.ParseUUIDPipe())),
    __param(2, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BiasController.prototype, "getBiasFlags", null);
__decorate([
    (0, common_1.Get)(':job_id/bias-report'),
    __param(0, (0, common_1.Param)('job_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_recruiter_decorator_1.CurrentRecruiter)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BiasController.prototype, "getBiasReport", null);
exports.BiasController = BiasController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [bias_service_1.BiasService])
], BiasController);
//# sourceMappingURL=bias.controller.js.map