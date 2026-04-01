"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortlistModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const shortlist_entry_entity_1 = require("../entities/shortlist-entry.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const shortlist_controller_1 = require("./shortlist.controller");
const shortlist_service_1 = require("./shortlist.service");
const scoring_module_1 = require("../scoring/scoring.module");
let ShortlistModule = class ShortlistModule {
};
exports.ShortlistModule = ShortlistModule;
exports.ShortlistModule = ShortlistModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shortlist_entry_entity_1.ShortlistEntry, fit_score_entity_1.FitScore, candidate_profile_entity_1.CandidateProfile, job_description_entity_1.JobDescription, screening_criteria_entity_1.ScreeningCriteria]),
            scoring_module_1.ScoringModule,
        ],
        controllers: [shortlist_controller_1.ShortlistController],
        providers: [shortlist_service_1.ShortlistService],
        exports: [shortlist_service_1.ShortlistService],
    })
], ShortlistModule);
//# sourceMappingURL=shortlist.module.js.map