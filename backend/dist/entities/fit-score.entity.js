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
exports.FitScore = void 0;
const typeorm_1 = require("typeorm");
let FitScore = class FitScore {
};
exports.FitScore = FitScore;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FitScore.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'candidate_id', type: 'uuid' }),
    __metadata("design:type", String)
], FitScore.prototype, "candidateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', type: 'uuid' }),
    __metadata("design:type", String)
], FitScore.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'criteria_version', type: 'integer' }),
    __metadata("design:type", Number)
], FitScore.prototype, "criteriaVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], FitScore.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], FitScore.prototype, "breakdown", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'ok' }),
    __metadata("design:type", String)
], FitScore.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'computed_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FitScore.prototype, "computedAt", void 0);
exports.FitScore = FitScore = __decorate([
    (0, typeorm_1.Entity)('fit_scores'),
    (0, typeorm_1.Index)(['candidateId', 'jobId'])
], FitScore);
//# sourceMappingURL=fit-score.entity.js.map