import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extract tenant context from headers (mock authentication)
    const userId = request.headers['x-user-id'];
    const organizationId = request.headers['x-organization-id'];
    const role = request.headers['x-user-role'];

    // Validate required headers
    if (!userId || !organizationId || !role) {
      throw new BadRequestException(
        'Missing required headers: x-user-id, x-organization-id, x-user-role',
      );
    }

    // Validate role
    if (!['ADMIN', 'MEMBER'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be ADMIN or MEMBER');
    }

    // Attach tenant context to request
    request.tenantContext = {
      userId,
      organizationId,
      role,
    };

    return true;
  }
}
