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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateProfile = void 0;
const typeorm_1 = require("typeorm");
let CandidateProfile = class CandidateProfile {
};
exports.CandidateProfile = CandidateProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CandidateProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'schema_version', type: 'varchar', length: 10, default: '1' }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "schemaVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', type: 'uuid' }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], CandidateProfile.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_experience', type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], CandidateProfile.prototype, "workExperience", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], CandidateProfile.prototype, "education", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], CandidateProfile.prototype, "skills", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parse_status', type: 'varchar', length: 20, default: 'success' }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "parseStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CandidateProfile.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'varchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], CandidateProfile.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CandidateProfile.prototype, "createdAt", void 0);
exports.CandidateProfile = CandidateProfile = __decorate([
    (0, typeorm_1.Entity)('candidate_profiles'),
    (0, typeorm_1.Index)(['jobId'])
], CandidateProfile);
//# sourceMappingURL=candidate-profile.entity.js.map