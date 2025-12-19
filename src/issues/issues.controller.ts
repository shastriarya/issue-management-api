import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { TenantGuard } from '../common/tenant/tenant.guard';

@Controller('issues')
@UseGuards(TenantGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  create(@Body() createIssueDto: CreateIssueDto, @Request() req: any) {
    const { organizationId } = req.tenantContext;
    return this.issuesService.create(createIssueDto, organizationId);
  }

  @Get()
  findAll(@Request() req: any) {
    const { organizationId } = req.tenantContext;
    return this.issuesService.findAll(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const { organizationId } = req.tenantContext;
    return this.issuesService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIssueDto: UpdateIssueDto,
    @Request() req: any,
  ) {
    const { organizationId, role } = req.tenantContext;
    return this.issuesService.update(
      id,
      updateIssueDto,
      organizationId,
      role,
    );
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    const { organizationId, role } = req.tenantContext;
    return this.issuesService.delete(id, organizationId, role);
  }
}
