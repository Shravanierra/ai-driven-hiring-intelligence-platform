"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiasModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bias_flag_entity_1 = require("../entities/bias-flag.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const bias_controller_1 = require("./bias.controller");
const bias_service_1 = require("./bias.service");
let BiasModule = class BiasModule {
};
exports.BiasModule = BiasModule;
exports.BiasModule = BiasModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([bias_flag_entity_1.BiasFlag, fit_score_entity_1.FitScore, candidate_profile_entity_1.CandidateProfile, job_description_entity_1.JobDescription]),
        ],
        controllers: [bias_controller_1.BiasController],
        providers: [bias_service_1.BiasService],
        exports: [bias_service_1.BiasService],
    })
], BiasModule);
//# sourceMappingURL=bias.module.js.map