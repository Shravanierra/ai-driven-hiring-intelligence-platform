import { InterviewKit } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
export declare class InterviewKitPdfService {
    generatePdf(kit: InterviewKit, profile: CandidateProfile): Promise<Buffer>;
    private buildDocDefinition;
}
