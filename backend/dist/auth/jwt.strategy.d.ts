import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
export interface JwtPayload {
    sub: string;
    email?: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRecruiter {
    recruiterId: string;
    email?: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    constructor(config: ConfigService);
    validate(payload: JwtPayload): AuthenticatedRecruiter;
}
export {};
