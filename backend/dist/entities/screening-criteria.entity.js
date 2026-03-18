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
exports.ScreeningCriteria = void 0;
const typeorm_1 = require("typeorm");
let ScreeningCriteria = class ScreeningCriteria {
};
exports.ScreeningCriteria = ScreeningCriteria;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScreeningCriteria.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', type: 'uuid' }),
    __metadata("design:type", String)
], ScreeningCriteria.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 1 }),
    __metadata("design:type", Number)
], ScreeningCriteria.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'required_skills', type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], ScreeningCriteria.prototype, "requiredSkills", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'preferred_skills', type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], ScreeningCriteria.prototype, "preferredSkills", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'experience_level', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ScreeningCriteria.prototype, "experienceLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], ScreeningCriteria.prototype, "responsibilities", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_criteria', type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], ScreeningCriteria.prototype, "customCriteria", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ScreeningCriteria.prototype, "updatedAt", void 0);
exports.ScreeningCriteria = ScreeningCriteria = __decorate([
    (0, typeorm_1.Entity)('screening_criteria'),
    (0, typeorm_1.Index)(['jobId', 'version'], { unique: true })
], ScreeningCriteria);
//# sourceMappingURL=screening-criteria.entity.js.map