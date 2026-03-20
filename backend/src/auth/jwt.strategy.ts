import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // recruiter_id
  email?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRecruiter {
  recruiterId: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'your-jwt-secret-here'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedRecruiter {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing recruiter_id');
    }
    return {
      recruiterId: payload.sub,
      email: payload.email,
    };
  }
}
