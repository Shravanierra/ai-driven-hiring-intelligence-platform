import { Body, Controller, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from './public.decorator';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

/**
 * Minimal auth controller for the prototype.
 * In production replace with a proper user store and password hashing.
 *
 * POST /auth/register  — create a recruiter account, returns JWT
 * POST /auth/login     — sign in, returns JWT
 */
@Public()
@Controller('auth')
export class AuthController {
  // In-memory user store for prototype (replace with DB in production)
  private readonly users = new Map<string, { id: string; email: string; password: string }>();

  constructor(private readonly jwtService: JwtService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    if (this.users.has(dto.email)) {
      return { error: 'Email already registered' };
    }
    const id = crypto.randomUUID();
    this.users.set(dto.email, { id, email: dto.email, password: dto.password });
    const token = this.jwtService.sign({ sub: id, email: dto.email });
    return { access_token: token, recruiter_id: id };
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    const user = this.users.get(dto.email);
    if (!user || user.password !== dto.password) {
      return { error: 'Invalid credentials' };
    }
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token, recruiter_id: user.id };
  }
}
