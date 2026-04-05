import { JwtService } from '@nestjs/jwt';
declare class RegisterDto {
    email: string;
    password: string;
}
declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthController {
    private readonly jwtService;
    private readonly users;
    constructor(jwtService: JwtService);
    register(dto: RegisterDto): {
        error: string;
        message?: undefined;
    } | {
        message: string;
        error?: undefined;
    };
    login(dto: LoginDto): {
        error: string;
        access_token?: undefined;
        recruiter_id?: undefined;
    } | {
        access_token: string;
        recruiter_id: string;
        error?: undefined;
    };
}
export {};
