import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    req.user = {
      userId: req.headers['x-user-id'],
      organizationId: req.headers['x-org-id'],
      role: req.headers['x-user-role'],
    };

    return true;
  }
}
