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
exports.BiasFlag = void 0;
const typeorm_1 = require("typeorm");
let BiasFlag = class BiasFlag {
};
exports.BiasFlag = BiasFlag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BiasFlag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'candidate_id', type: 'uuid' }),
    __metadata("design:type", String)
], BiasFlag.prototype, "candidateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', type: 'uuid' }),
    __metadata("design:type", String)
], BiasFlag.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signal_type', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], BiasFlag.prototype, "signalType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], BiasFlag.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'affected_criterion', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], BiasFlag.prototype, "affectedCriterion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], BiasFlag.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BiasFlag.prototype, "createdAt", void 0);
exports.BiasFlag = BiasFlag = __decorate([
    (0, typeorm_1.Entity)('bias_flags'),
    (0, typeorm_1.Index)(['candidateId', 'jobId'])
], BiasFlag);
//# sourceMappingURL=bias-flag.entity.js.map