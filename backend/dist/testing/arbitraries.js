"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arbitraryOrderedShortlist = exports.arbitraryInterviewKit = exports.arbInterviewQuestion = exports.arbitraryShortlistEntry = exports.arbitraryFitScore = exports.arbBreakdownItem = exports.arbitraryScreeningCriteria = exports.arbCustomCriterion = exports.arbitraryCandidateProfile = exports.arbSkill = exports.arbEducation = exports.arbWorkExperience = exports.arbContact = exports.arbYearMonth = exports.arbIsoDate = exports.arbNonEmptyString = exports.arbUuid = void 0;
const fc = require("fast-check");
const candidate_profile_entity_1 = require("../entities/candidate-profile.entity");
const screening_criteria_entity_1 = require("../entities/screening-criteria.entity");
const fit_score_entity_1 = require("../entities/fit-score.entity");
const shortlist_entry_entity_1 = require("../entities/shortlist-entry.entity");
const interview_kit_entity_1 = require("../entities/interview-kit.entity");
const arbUuid = () => fc.uuid();
exports.arbUuid = arbUuid;
const arbNonEmptyString = (maxLength = 200) => fc.string({ minLength: 1, maxLength });
exports.arbNonEmptyString = arbNonEmptyString;
const arbIsoDate = () => fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString());
exports.arbIsoDate = arbIsoDate;
const arbYearMonth = () => fc
    .tuple(fc.integer({ min: 2000, max: 2024 }), fc.integer({ min: 1, max: 12 }))
    .map(([y, m]) => `${y}-${String(m).padStart(2, '0')}`);
exports.arbYearMonth = arbYearMonth;
const arbContact = () => fc.record({
    email: fc.emailAddress(),
    phone: fc.option(fc.string({ minLength: 7, maxLength: 20 }), { nil: null }),
    location: fc.option((0, exports.arbNonEmptyString)(100), { nil: null }),
});
exports.arbContact = arbContact;
const arbWorkExperience = () => fc.record({
    company: (0, exports.arbNonEmptyString)(100),
    title: (0, exports.arbNonEmptyString)(100),
    start_date: (0, exports.arbYearMonth)(),
    end_date: fc.option((0, exports.arbYearMonth)(), { nil: null }),
    description: (0, exports.arbNonEmptyString)(500),
});
exports.arbWorkExperience = arbWorkExperience;
const arbEducation = () => fc.record({
    institution: (0, exports.arbNonEmptyString)(200),
    degree: (0, exports.arbNonEmptyString)(100),
    field: (0, exports.arbNonEmptyString)(100),
    graduation_year: fc.option(fc.integer({ min: 1970, max: 2030 }), { nil: null }),
});
exports.arbEducation = arbEducation;
const arbSkill = () => fc.record({
    canonical_name: (0, exports.arbNonEmptyString)(100),
    raw_aliases: fc.array((0, exports.arbNonEmptyString)(100), { minLength: 1, maxLength: 5 }),
});
exports.arbSkill = arbSkill;
const arbitraryCandidateProfile = () => fc
    .record({
    id: (0, exports.arbUuid)(),
    jobId: (0, exports.arbUuid)(),
    name: (0, exports.arbNonEmptyString)(200),
    contact: (0, exports.arbContact)(),
    workExperience: fc.array((0, exports.arbWorkExperience)(), { minLength: 0, maxLength: 5 }),
    education: fc.array((0, exports.arbEducation)(), { minLength: 0, maxLength: 3 }),
    skills: fc.array((0, exports.arbSkill)(), { minLength: 0, maxLength: 10 }),
    summary: fc.string({ minLength: 0, maxLength: 500 }),
    parseStatus: fc.constantFrom('success', 'error'),
    errorMessage: fc.option((0, exports.arbNonEmptyString)(300), { nil: null }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
})
    .map((rec) => {
    const profile = new candidate_profile_entity_1.CandidateProfile();
    profile.schemaVersion = '1';
    profile.id = rec.id;
    profile.jobId = rec.jobId;
    profile.name = rec.name;
    profile.contact = rec.contact;
    profile.workExperience = rec.workExperience;
    profile.education = rec.education;
    profile.skills = rec.skills;
    profile.summary = rec.summary;
    profile.parseStatus = rec.parseStatus;
    profile.errorMessage = rec.errorMessage;
    profile.createdAt = rec.createdAt;
    return profile;
});
exports.arbitraryCandidateProfile = arbitraryCandidateProfile;
const arbCustomCriterion = () => fc.record({
    label: (0, exports.arbNonEmptyString)(100),
    weight: fc.float({ min: 0, max: 1, noNaN: true }),
    description: (0, exports.arbNonEmptyString)(300),
});
exports.arbCustomCriterion = arbCustomCriterion;
const arbitraryScreeningCriteria = () => fc
    .record({
    id: (0, exports.arbUuid)(),
    jobId: (0, exports.arbUuid)(),
    version: fc.integer({ min: 1, max: 100 }),
    requiredSkills: fc.array((0, exports.arbNonEmptyString)(100), { minLength: 1, maxLength: 10 }),
    preferredSkills: fc.array((0, exports.arbNonEmptyString)(100), { minLength: 0, maxLength: 10 }),
    experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'lead'),
    responsibilities: fc.array((0, exports.arbNonEmptyString)(200), { minLength: 1, maxLength: 10 }),
    customCriteria: fc.array((0, exports.arbCustomCriterion)(), { minLength: 0, maxLength: 5 }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
})
    .map((rec) => {
    const criteria = new screening_criteria_entity_1.ScreeningCriteria();
    Object.assign(criteria, rec);
    return criteria;
});
exports.arbitraryScreeningCriteria = arbitraryScreeningCriteria;
const arbBreakdownItem = () => fc.record({
    criterion_label: (0, exports.arbNonEmptyString)(100),
    status: fc.constantFrom('met', 'partial', 'not_met'),
    contribution: fc.float({ min: 0, max: 100, noNaN: true }),
    explanation: (0, exports.arbNonEmptyString)(300),
});
exports.arbBreakdownItem = arbBreakdownItem;
const arbitraryFitScore = () => fc
    .record({
    id: (0, exports.arbUuid)(),
    candidateId: (0, exports.arbUuid)(),
    jobId: (0, exports.arbUuid)(),
    criteriaVersion: fc.integer({ min: 1, max: 100 }),
    score: fc.float({ min: 0, max: 100, noNaN: true }),
    breakdown: fc.array((0, exports.arbBreakdownItem)(), { minLength: 1, maxLength: 10 }),
    computedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
})
    .map((rec) => {
    const fitScore = new fit_score_entity_1.FitScore();
    Object.assign(fitScore, rec);
    return fitScore;
});
exports.arbitraryFitScore = arbitraryFitScore;
const arbitraryShortlistEntry = () => fc
    .record({
    id: (0, exports.arbUuid)(),
    jobId: (0, exports.arbUuid)(),
    candidateId: (0, exports.arbUuid)(),
    rank: fc.integer({ min: 1, max: 50 }),
    fitScore: fc.float({ min: 0, max: 100, noNaN: true }),
    reasoning: (0, exports.arbNonEmptyString)(500),
    decision: fc.constantFrom('pending', 'accepted', 'rejected', 'deferred'),
    decidedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: null }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
})
    .map((rec) => {
    const entry = new shortlist_entry_entity_1.ShortlistEntry();
    Object.assign(entry, rec);
    return entry;
});
exports.arbitraryShortlistEntry = arbitraryShortlistEntry;
const arbInterviewQuestion = () => fc.record({
    id: (0, exports.arbUuid)(),
    type: fc.constantFrom('behavioral', 'technical', 'gap'),
    text: (0, exports.arbNonEmptyString)(500),
    rubric: fc.record({
        strong: (0, exports.arbNonEmptyString)(300),
        adequate: (0, exports.arbNonEmptyString)(300),
        weak: (0, exports.arbNonEmptyString)(300),
    }),
});
exports.arbInterviewQuestion = arbInterviewQuestion;
const arbitraryInterviewKit = () => fc
    .record({
    id: (0, exports.arbUuid)(),
    candidateId: (0, exports.arbUuid)(),
    jobId: (0, exports.arbUuid)(),
    questions: fc.array((0, exports.arbInterviewQuestion)(), { minLength: 5, maxLength: 15 }),
    generatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
})
    .map((rec) => {
    const kit = new interview_kit_entity_1.InterviewKit();
    Object.assign(kit, rec);
    return kit;
});
exports.arbitraryInterviewKit = arbitraryInterviewKit;
const arbitraryOrderedShortlist = (maxSize = 50) => fc
    .tuple((0, exports.arbUuid)(), fc.array(fc.record({
    candidateId: (0, exports.arbUuid)(),
    fitScore: fc.float({ min: 0, max: 100, noNaN: true }),
    reasoning: (0, exports.arbNonEmptyString)(300),
}), { minLength: 1, maxLength: maxSize }))
    .map(([jobId, items]) => {
    const sorted = [...items].sort((a, b) => b.fitScore - a.fitScore);
    return sorted.map((item, idx) => {
        const entry = new shortlist_entry_entity_1.ShortlistEntry();
        entry.id = `entry-${idx}`;
        entry.jobId = jobId;
        entry.candidateId = item.candidateId;
        entry.rank = idx + 1;
        entry.fitScore = item.fitScore;
        entry.reasoning = item.reasoning;
        entry.decision = 'pending';
        entry.decidedAt = null;
        entry.createdAt = new Date();
        return entry;
    });
});
exports.arbitraryOrderedShortlist = arbitraryOrderedShortlist;
//# sourceMappingURL=arbitraries.js.map