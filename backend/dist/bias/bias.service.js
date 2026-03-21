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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BiasService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiasService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bias_flag_entity_1 = require("../entities/bias-flag.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const job_description_entity_1 = require("../entities/job-description.entity");
const IVY_LEAGUE_PATTERNS = [
    'harvard', 'yale', 'princeton', 'columbia', 'penn', 'dartmouth', 'brown', 'cornell',
    'mit', 'stanford', 'caltech', 'duke', 'vanderbilt', 'notre dame', 'georgetown',
];
const HBCU_PATTERNS = [
    'howard', 'spelman', 'morehouse', 'fisk', 'hampton', 'tuskegee', 'xavier',
    'florida a&m', 'north carolina a&t', 'prairie view', 'grambling',
];
const GRADUATION_YEAR_OLD_THRESHOLD = new Date().getFullYear() - 35;
const GRADUATION_YEAR_RECENT_THRESHOLD = new Date().getFullYear() - 2;
const NAME_PROXY_PATTERNS = [
    /\b(mr|mrs|ms|dr)\b/i,
];
let BiasService = BiasService_1 = class BiasService {
    constructor(biasFlagRepo, fitScoreRepo, profileRepo, jobRepo) {
        this.biasFlagRepo = biasFlagRepo;
        this.fitScoreRepo = fitScoreRepo;
        this.profileRepo = profileRepo;
        this.jobRepo = jobRepo;
        this.logger = new common_1.Logger(BiasService_1.name);
    }
    async getBiasFlags(jobId, candidateId, recruiterId) {
        await this.validateJobAndCandidate(jobId, candidateId, recruiterId);
        const fitScore = await this.fitScoreRepo.findOne({ where: { candidateId, jobId } });
        if (!fitScore) {
            return [];
        }
        const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate "${candidateId}" not found`);
        }
        const signals = this.detectSignals(fitScore.breakdown, profile);
        await this.biasFlagRepo.delete({ candidateId, jobId });
        if (signals.length === 0) {
            return [];
        }
        const flags = signals.map((s) => this.biasFlagRepo.create({
            candidateId,
            jobId,
            signalType: s.signal_type,
            description: s.description,
            affectedCriterion: s.affected_criterion,
            severity: s.severity,
        }));
        return this.biasFlagRepo.save(flags);
    }
    async getBiasReport(jobId, recruiterId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
        }
        if (recruiterId && job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
        }
        const profiles = await this.profileRepo.find({ where: { jobId } });
        const candidateCount = profiles.length;
        const allFlags = [];
        const scores = [];
        for (const profile of profiles) {
            const fitScore = await this.fitScoreRepo.findOne({
                where: { candidateId: profile.id, jobId },
            });
            if (!fitScore || fitScore.status === 'error')
                continue;
            scores.push(Number(fitScore.score));
            const signals = this.detectSignals(fitScore.breakdown, profile);
            for (const s of signals) {
                allFlags.push(this.biasFlagRepo.create({
                    candidateId: profile.id,
                    jobId,
                    signalType: s.signal_type,
                    description: s.description,
                    affectedCriterion: s.affected_criterion,
                    severity: s.severity,
                }));
            }
        }
        const scoreDistribution = this.computeDistribution(scores);
        const flaggedSignals = this.aggregateFlags(allFlags);
        return {
            jobId,
            candidateCount,
            scoreDistribution,
            flaggedSignals,
            totalFlags: allFlags.length,
        };
    }
    detectSignals(breakdown, profile) {
        const signals = [];
        for (const edu of profile.education) {
            const institutionLower = edu.institution.toLowerCase();
            const isIvy = IVY_LEAGUE_PATTERNS.some((p) => institutionLower.includes(p));
            if (isIvy) {
                signals.push({
                    signal_type: 'institution_prestige_proxy',
                    description: `Education at "${edu.institution}" may serve as a demographic proxy for socioeconomic background or legacy admissions bias.`,
                    affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
                    severity: 'medium',
                });
            }
            const isHBCU = HBCU_PATTERNS.some((p) => institutionLower.includes(p));
            if (isHBCU) {
                signals.push({
                    signal_type: 'institution_demographic_proxy',
                    description: `Education at "${edu.institution}" (HBCU) may serve as a demographic proxy for race/ethnicity.`,
                    affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
                    severity: 'high',
                });
            }
            if (edu.graduation_year !== null) {
                if (edu.graduation_year <= GRADUATION_YEAR_OLD_THRESHOLD) {
                    signals.push({
                        signal_type: 'graduation_year_age_proxy',
                        description: `Graduation year ${edu.graduation_year} may imply candidate age (55+), which is a protected attribute.`,
                        affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
                        severity: 'high',
                    });
                }
                else if (edu.graduation_year >= GRADUATION_YEAR_RECENT_THRESHOLD) {
                    signals.push({
                        signal_type: 'graduation_year_age_proxy',
                        description: `Graduation year ${edu.graduation_year} may imply candidate is a recent graduate, potentially signaling age.`,
                        affected_criterion: this.findAffectedCriterion(breakdown, 'education'),
                        severity: 'low',
                    });
                }
            }
        }
        for (const item of breakdown) {
            const explanationLower = item.explanation.toLowerCase();
            const nameInExplanation = NAME_PROXY_PATTERNS.some((p) => p.test(item.explanation));
            if (nameInExplanation) {
                signals.push({
                    signal_type: 'name_in_criterion_explanation',
                    description: `Criterion "${item.criterion_label}" explanation contains a name-related pattern, which may indicate name bias in scoring.`,
                    affected_criterion: item.criterion_label,
                    severity: 'high',
                });
            }
            if (profile.name && profile.name.trim().length > 0) {
                const nameParts = profile.name.trim().split(/\s+/).filter((p) => p.length > 2);
                const nameFoundInExplanation = nameParts.some((part) => explanationLower.includes(part.toLowerCase()));
                if (nameFoundInExplanation) {
                    signals.push({
                        signal_type: 'name_in_criterion_explanation',
                        description: `Candidate name appears in criterion "${item.criterion_label}" explanation, which may indicate name-based scoring bias.`,
                        affected_criterion: item.criterion_label,
                        severity: 'high',
                    });
                }
            }
        }
        for (const exp of profile.workExperience) {
            const companyLower = exp.company.toLowerCase();
            if (companyLower.includes('church') ||
                companyLower.includes('mosque') ||
                companyLower.includes('synagogue') ||
                companyLower.includes('temple')) {
                signals.push({
                    signal_type: 'religious_organization_proxy',
                    description: `Work experience at "${exp.company}" may serve as a proxy for religious affiliation, a protected attribute.`,
                    affected_criterion: this.findAffectedCriterion(breakdown, 'experience'),
                    severity: 'medium',
                });
            }
        }
        return this.deduplicateSignals(signals);
    }
    findAffectedCriterion(breakdown, keyword) {
        const match = breakdown.find((item) => item.criterion_label.toLowerCase().includes(keyword));
        return match ? match.criterion_label : null;
    }
    deduplicateSignals(signals) {
        const seen = new Set();
        return signals.filter((s) => {
            const key = `${s.signal_type}::${s.affected_criterion ?? ''}::${s.description}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    computeDistribution(scores) {
        if (scores.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, stddev: 0 };
        }
        const sorted = [...scores].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
        const stddev = Math.sqrt(variance);
        return {
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            mean: Math.round(mean * 100) / 100,
            median: Math.round(median * 100) / 100,
            stddev: Math.round(stddev * 100) / 100,
        };
    }
    aggregateFlags(flags) {
        const map = new Map();
        for (const flag of flags) {
            const existing = map.get(flag.signalType);
            if (existing) {
                existing.count++;
                if (flag.affectedCriterion)
                    existing.affected_criteria.add(flag.affectedCriterion);
                if (this.severityRank(flag.severity) > this.severityRank(existing.severity)) {
                    existing.severity = flag.severity;
                }
            }
            else {
                map.set(flag.signalType, {
                    count: 1,
                    severity: flag.severity,
                    affected_criteria: new Set(flag.affectedCriterion ? [flag.affectedCriterion] : []),
                });
            }
        }
        return Array.from(map.entries()).map(([signal_type, data]) => ({
            signal_type,
            count: data.count,
            severity: data.severity,
            affected_criteria: Array.from(data.affected_criteria),
        }));
    }
    severityRank(s) {
        return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
    }
    async validateJobAndCandidate(jobId, candidateId, recruiterId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job description with id "${jobId}" not found`);
        }
        if (recruiterId && job.recruiterId !== recruiterId) {
            throw new common_1.ForbiddenException(`You do not have access to job "${jobId}"`);
        }
        const profile = await this.profileRepo.findOne({ where: { id: candidateId } });
        if (!profile) {
            throw new common_1.NotFoundException(`Candidate with id "${candidateId}" not found`);
        }
        if (profile.jobId !== jobId) {
            throw new common_1.NotFoundException(`Candidate "${candidateId}" does not belong to job "${jobId}"`);
        }
    }
};
exports.BiasService = BiasService;
exports.BiasService = BiasService = BiasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bias_flag_entity_1.BiasFlag)),
    __param(1, (0, typeorm_1.InjectRepository)(fit_score_entity_1.FitScore)),
    __param(2, (0, typeorm_1.InjectRepository)(candidate_profile_entity_1.CandidateProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(job_description_entity_1.JobDescription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BiasService);
//# sourceMappingURL=bias.service.js.map