"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const scoring_controller_1 = require("./scoring.controller");
const scoring_service_1 = require("./scoring.service");
let ScoringModule = class ScoringModule {
};
exports.ScoringModule = ScoringModule;
exports.ScoringModule = ScoringModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([fit_score_entity_1.FitScore, candidate_profile_entity_1.CandidateProfile, screening_criteria_entity_1.ScreeningCriteria, job_description_entity_1.JobDescription]),
        ],
        controllers: [scoring_controller_1.ScoringController],
        providers: [scoring_service_1.ScoringService],
        exports: [scoring_service_1.ScoringService],
    })
], ScoringModule);
//# sourceMappingURL=scoring.module.js.map