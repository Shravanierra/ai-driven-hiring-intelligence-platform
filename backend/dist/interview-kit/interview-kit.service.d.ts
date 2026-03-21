import { Repository } from 'typeorm';
import { InterviewKit, InterviewQuestion } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { ScreeningCriteria } from '../entities/screening-criteria.entity';
import { JobDescription } from '../entities/job-description.entity';
import { LlmClient } from '../llm/llm.client';
import { InterviewKitPdfService } from './interview-kit-pdf.service';
export declare class InterviewKitService {
    private readonly kitRepo;
    private readonly profileRepo;
    private readonly criteriaRepo;
    private readonly jobRepo;
    private readonly llmClient;
    private readonly pdfService;
    private readonly logger;
    constructor(kitRepo: Repository<InterviewKit>, profileRepo: Repository<CandidateProfile>, criteriaRepo: Repository<ScreeningCriteria>, jobRepo: Repository<JobDescription>, llmClient: LlmClient, pdfService: InterviewKitPdfService);
    generateKit(jobId: string, candidateId: string, recruiterId?: string): Promise<InterviewKit>;
    getKit(jobId: string, candidateId: string, recruiterId?: string): Promise<InterviewKit>;
    updateKit(jobId: string, candidateId: string, questions: InterviewQuestion[], recruiterId?: string): Promise<InterviewKit>;
    exportKitPdf(jobId: string, candidateId: string, recruiterId?: string): Promise<Buffer>;
    private callLlmForQuestions;
    private parseAndValidateQuestions;
}
