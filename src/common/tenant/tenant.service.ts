import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: string;
}

@Injectable()
export class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {}

  getTenantContext(): TenantContext {
    const tenantContext = (this.request as any).tenantContext;
    return tenantContext;
  }
}
