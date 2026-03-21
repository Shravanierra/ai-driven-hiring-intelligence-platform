"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_config_1 = require("./database/typeorm.config");
const llm_module_1 = require("./llm/llm.module");
const auth_module_1 = require("./auth/auth.module");
const jobs_module_1 = require("./jobs/jobs.module");
const resumes_module_1 = require("./resumes/resumes.module");
const scoring_module_1 = require("./scoring/scoring.module");
const shortlist_module_1 = require("./shortlist/shortlist.module");
const bias_module_1 = require("./bias/bias.module");
const assistant_module_1 = require("./assistant/assistant.module");
const interview_kit_module_1 = require("./interview-kit/interview-kit.module");
const candidate_profile_module_1 = require("./candidate-profile/candidate-profile.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync(typeorm_config_1.typeOrmConfig),
            llm_module_1.LlmModule,
            auth_module_1.AuthModule,
            jobs_module_1.JobsModule,
            resumes_module_1.ResumesModule,
            scoring_module_1.ScoringModule,
            shortlist_module_1.ShortlistModule,
            bias_module_1.BiasModule,
            assistant_module_1.AssistantModule,
            interview_kit_module_1.InterviewKitModule,
            candidate_profile_module_1.CandidateProfileModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map