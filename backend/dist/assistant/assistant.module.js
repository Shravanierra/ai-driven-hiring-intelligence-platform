"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const assistant_session_entity_1 = require("../entities/assistant-session.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const assistant_controller_1 = require("./assistant.controller");
const assistant_service_1 = require("./assistant.service");
let AssistantModule = class AssistantModule {
};
exports.AssistantModule = AssistantModule;
exports.AssistantModule = AssistantModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                assistant_session_entity_1.AssistantSession,
                job_description_entity_1.JobDescription,
                candidate_profile_entity_1.CandidateProfile,
                fit_score_entity_1.FitScore,
            ]),
        ],
        controllers: [assistant_controller_1.AssistantController],
        providers: [assistant_service_1.AssistantService],
        exports: [assistant_service_1.AssistantService],
    })
], AssistantModule);
//# sourceMappingURL=assistant.module.js.map