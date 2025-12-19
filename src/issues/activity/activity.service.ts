import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateActivityInput {
  issueId: string;
  field: string;
  oldValue?: string;
  newValue: string;
  organizationId: string;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async logActivity(data: CreateActivityInput) {
    return this.prisma.activity.create({
      data: {
        issueId: data.issueId,
        field: data.field,
        oldValue: data.oldValue,
        newValue: data.newValue,
        organizationId: data.organizationId,
      },
    });
  }

  async getActivitiesByIssue(issueId: string, organizationId: string) {
    return this.prisma.activity.findMany({
      where: {
        issueId,
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
