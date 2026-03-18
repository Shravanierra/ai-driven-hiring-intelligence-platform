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
exports.JobDescription = void 0;
const typeorm_1 = require("typeorm");
let JobDescription = class JobDescription {
};
exports.JobDescription = JobDescription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JobDescription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recruiter_id', type: 'uuid' }),
    __metadata("design:type", String)
], JobDescription.prototype, "recruiterId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], JobDescription.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raw_text', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], JobDescription.prototype, "rawText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'varchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], JobDescription.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parsed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], JobDescription.prototype, "parsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        default: 'pending',
    }),
    __metadata("design:type", String)
], JobDescription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], JobDescription.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], JobDescription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], JobDescription.prototype, "updatedAt", void 0);
exports.JobDescription = JobDescription = __decorate([
    (0, typeorm_1.Entity)('job_descriptions')
], JobDescription);
//# sourceMappingURL=job-description.entity.js.map