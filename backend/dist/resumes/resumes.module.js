"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const resumes_controller_1 = require("./resumes.controller");
const resumes_service_1 = require("./resumes.service");
const skill_extractor_service_1 = require("./skill-extractor.service");
const summary_generator_service_1 = require("./summary-generator.service");
let ResumesModule = class ResumesModule {
};
exports.ResumesModule = ResumesModule;
exports.ResumesModule = ResumesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([candidate_profile_entity_1.CandidateProfile, job_description_entity_1.JobDescription])],
        controllers: [resumes_controller_1.ResumesController],
        providers: [resumes_service_1.ResumesService, skill_extractor_service_1.SkillExtractorService, summary_generator_service_1.SummaryGeneratorService],
        exports: [resumes_service_1.ResumesService, skill_extractor_service_1.SkillExtractorService, summary_generator_service_1.SummaryGeneratorService],
    })
], ResumesModule);
//# sourceMappingURL=resumes.module.js.map