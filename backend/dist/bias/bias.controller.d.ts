import { BiasService, BiasReport } from './bias.service';
import { BiasFlag } from '../entities/bias-flag.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
export declare class BiasController {
    private readonly biasService;
    constructor(biasService: BiasService);
    getBiasFlags(jobId: string, candidateId: string, recruiter: AuthenticatedRecruiter): Promise<BiasFlag[]>;
    getBiasReport(jobId: string, recruiter: AuthenticatedRecruiter): Promise<BiasReport>;
}
