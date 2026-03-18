"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = void 0;
const config_1 = require("@nestjs/config");
const job_description_entity_1 = require("../entities/job-description.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const shortlist_entry_entity_1 = require("../entities/shortlist-entry.entity");
const bias_flag_entity_1 = require("../entities/bias-flag.entity");
const interview_kit_entity_1 = require("../entities/interview-kit.entity");
const assistant_session_entity_1 = require("../entities/assistant-session.entity");
exports.typeOrmConfig = {
    imports: [config_1.ConfigModule],
    inject: [config_1.ConfigService],
    useFactory: (config) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'hiring'),
        password: config.get('DB_PASSWORD', 'hiring_secret'),
        database: config.get('DB_DATABASE', 'hiring_platform'),
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
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
    }),
};
//# sourceMappingURL=typeorm.config.js.map