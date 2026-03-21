import { AssistantService } from './assistant.service';
import { AssistantSession } from '../entities/assistant-session.entity';
import { AuthenticatedRecruiter } from '../auth/jwt.strategy';
declare class QueryDto {
    query: string;
}
export declare class AssistantController {
    private readonly assistantService;
    constructor(assistantService: AssistantService);
    createSession(recruiter: AuthenticatedRecruiter): Promise<AssistantSession>;
    query(sessionId: string, body: QueryDto, recruiter: AuthenticatedRecruiter): Promise<unknown>;
    getSession(sessionId: string, recruiter: AuthenticatedRecruiter): Promise<AssistantSession>;
}
export {};
