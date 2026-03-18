import * as fc from 'fast-check';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria, CustomCriterion } from '../entities/screening-criteria.entity';
import { FitScore, ScoreBreakdownItem } from '../entities/fit-score.entity';
import { ShortlistEntry } from '../entities/shortlist-entry.entity';
import { InterviewKit, InterviewQuestion } from '../entities/interview-kit.entity';
export declare const arbUuid: () => fc.Arbitrary<string>;
export declare const arbNonEmptyString: (maxLength?: number) => fc.Arbitrary<string>;
export declare const arbIsoDate: () => fc.Arbitrary<string>;
export declare const arbYearMonth: () => fc.Arbitrary<string>;
export declare const arbContact: () => fc.Arbitrary<{
    email: string;
    phone: string | null;
    location: string | null;
}>;
export declare const arbWorkExperience: () => fc.Arbitrary<{
    company: string;
    title: string;
    start_date: string;
    end_date: string | null;
    description: string;
}>;
export declare const arbEducation: () => fc.Arbitrary<{
    institution: string;
    degree: string;
    field: string;
    graduation_year: number | null;
}>;
export declare const arbSkill: () => fc.Arbitrary<{
    canonical_name: string;
    raw_aliases: string[];
}>;
export declare const arbitraryCandidateProfile: () => fc.Arbitrary<CandidateProfile>;
export declare const arbCustomCriterion: () => fc.Arbitrary<CustomCriterion>;
export declare const arbitraryScreeningCriteria: () => fc.Arbitrary<ScreeningCriteria>;
export declare const arbBreakdownItem: () => fc.Arbitrary<ScoreBreakdownItem>;
export declare const arbitraryFitScore: () => fc.Arbitrary<FitScore>;
export declare const arbitraryShortlistEntry: () => fc.Arbitrary<ShortlistEntry>;
export declare const arbInterviewQuestion: () => fc.Arbitrary<InterviewQuestion>;
export declare const arbitraryInterviewKit: () => fc.Arbitrary<InterviewKit>;
export declare const arbitraryOrderedShortlist: (maxSize?: number) => fc.Arbitrary<ShortlistEntry[]>;
