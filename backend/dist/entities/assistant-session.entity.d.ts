export interface SessionTurn {
    query: string;
    interpretation: string;
    candidate_ids: string[];
    timestamp: string;
}
export declare class AssistantSession {
    id: string;
    recruiterId: string;
    turns: SessionTurn[];
    createdAt: Date;
    updatedAt: Date;
}
