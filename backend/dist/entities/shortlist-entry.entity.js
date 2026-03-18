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
exports.ShortlistEntry = void 0;
const typeorm_1 = require("typeorm");
let ShortlistEntry = class ShortlistEntry {
};
exports.ShortlistEntry = ShortlistEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ShortlistEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', type: 'uuid' }),
    __metadata("design:type", String)
], ShortlistEntry.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'candidate_id', type: 'uuid' }),
    __metadata("design:type", String)
], ShortlistEntry.prototype, "candidateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], ShortlistEntry.prototype, "rank", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fit_score', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], ShortlistEntry.prototype, "fitScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ShortlistEntry.prototype, "reasoning", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        default: 'pending',
    }),
    __metadata("design:type", String)
], ShortlistEntry.prototype, "decision", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decided_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], ShortlistEntry.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ShortlistEntry.prototype, "createdAt", void 0);
exports.ShortlistEntry = ShortlistEntry = __decorate([
    (0, typeorm_1.Entity)('shortlist_entries'),
    (0, typeorm_1.Index)(['jobId', 'candidateId'], { unique: true })
], ShortlistEntry);
//# sourceMappingURL=shortlist-entry.entity.js.map