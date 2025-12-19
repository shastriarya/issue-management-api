import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum IssueStatusEnum {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
}

export class UpdateIssueDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(IssueStatusEnum)
  @IsOptional()
  status?: IssueStatusEnum;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;
}
