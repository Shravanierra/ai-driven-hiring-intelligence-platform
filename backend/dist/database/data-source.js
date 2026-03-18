"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
const job_description_entity_1 = require("../entities/job-description.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const shortlist_entry_entity_1 = require("../entities/shortlist-entry.entity");
const bias_flag_entity_1 = require("../entities/bias-flag.entity");
const interview_kit_entity_1 = require("../entities/interview-kit.entity");
const assistant_session_entity_1 = require("../entities/assistant-session.entity");
dotenv.config();
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'hiring',
    password: process.env.DB_PASSWORD ?? 'hiring_secret',
    database: process.env.DB_DATABASE ?? 'hiring_platform',
    entities: [
        job_description_entity_1.JobDescription,
        screening_criteria_entity_1.ScreeningCriteria,
        candidate_profile_entity_1.CandidateProfile,
        fit_score_entity_1.FitScore,
        shortlist_entry_entity_1.ShortlistEntry,
        bias_flag_entity_1.BiasFlag,
        interview_kit_entity_1.InterviewKit,
        assistant_session_entity_1.AssistantSession,
    ],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: true,
});
//# sourceMappingURL=data-source.js.map