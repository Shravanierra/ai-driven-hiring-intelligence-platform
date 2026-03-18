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
exports.InterviewKit = void 0;
const typeorm_1 = require("typeorm");
let InterviewKit = class InterviewKit {
};
exports.InterviewKit = InterviewKit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InterviewKit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'candidate_id', type: 'uuid' }),
    __metadata("design:type", String)
], InterviewKit.prototype, "candidateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', type: 'uuid' }),
    __metadata("design:type", String)
], InterviewKit.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], InterviewKit.prototype, "questions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'generated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InterviewKit.prototype, "generatedAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InterviewKit.prototype, "updatedAt", void 0);
exports.InterviewKit = InterviewKit = __decorate([
    (0, typeorm_1.Entity)('interview_kits'),
    (0, typeorm_1.Index)(['candidateId', 'jobId'])
], InterviewKit);
//# sourceMappingURL=interview-kit.entity.js.map