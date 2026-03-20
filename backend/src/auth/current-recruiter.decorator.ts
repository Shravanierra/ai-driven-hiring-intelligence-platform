import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRecruiter } from './jwt.strategy';

/**
 * Extracts the authenticated recruiter from the request object.
 * Usage: @CurrentRecruiter() recruiter: AuthenticatedRecruiter
 */
export const CurrentRecruiter = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRecruiter => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedRecruiter }>();
    return request.user;
  },
);
