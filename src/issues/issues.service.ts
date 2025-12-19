import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { ActivityService } from './activity/activity.service';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(
    createIssueDto: CreateIssueDto,
    organizationId: string,
  ) {
    return this.prisma.issue.create({
      data: {
        title: createIssueDto.title,
        description: createIssueDto.description,
        organizationId,
        assigneeId: createIssueDto.assigneeId || null,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.issue.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    // Enforce multi-tenancy: verify issue belongs to the requesting organization
    if (issue.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to access this issue',
      );
    }

    return issue;
  }

  async update(
    id: string,
    updateIssueDto: UpdateIssueDto,
    organizationId: string,
    userRole: string,
  ) {
    // Fetch existing issue
    const issue = await this.findOne(id, organizationId);

    // Only ADMIN can update status and assignee
    if (userRole !== 'ADMIN') {
      if (
        updateIssueDto.status !== undefined ||
        updateIssueDto.assigneeId !== undefined
      ) {
        throw new ForbiddenException(
          'Only ADMIN users can update status or assignee',
        );
      }
    }

    // Log activity for status changes
    if (
      updateIssueDto.status &&
      updateIssueDto.status !== issue.status
    ) {
      await this.activityService.logActivity({
        issueId: id,
        field: 'status',
        oldValue: issue.status,
        newValue: updateIssueDto.status,
        organizationId,
      });
    }

    // Log activity for assignee changes
    if (
      updateIssueDto.assigneeId !== undefined &&
      updateIssueDto.assigneeId !== issue.assigneeId
    ) {
      await this.activityService.logActivity({
        issueId: id,
        field: 'assigneeId',
        oldValue: issue.assigneeId || 'unassigned',
        newValue: updateIssueDto.assigneeId || 'unassigned',
        organizationId,
      });
    }

    return this.prisma.issue.update({
      where: { id },
      data: {
        title: updateIssueDto.title ?? issue.title,
        description: updateIssueDto.description ?? issue.description,
        status: updateIssueDto.status ?? issue.status,
        assigneeId: updateIssueDto.assigneeId !== undefined ? updateIssueDto.assigneeId : issue.assigneeId,
      },
    });
  }

  async delete(id: string, organizationId: string, userRole: string) {
    // Verify issue exists and belongs to organization
    await this.findOne(id, organizationId);

    // Only ADMIN can delete
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN users can delete issues');
    }

    return this.prisma.issue.delete({
      where: { id },
    });
  }
}
