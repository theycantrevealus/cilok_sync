import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { isJSON } from 'class-validator';

import { Authorization } from '@/decorators/auth.decorator';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { GlobalResponse } from '@/dtos/response.dto';
import { AllExceptionsFilter } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { CreateAuditTrailDto } from '../dtos/create-audit-trail.dto';
import { FilterAuditTrailDto } from '../dtos/filter-audit-trail.dto';
import {
  AuditTrailService,
  IPrimeDataTable,
} from '../services/audit-trail.service';

@ApiTags('Audit Trail')
@UseFilters(AllExceptionsFilter)
@Controller({ path: 'audit-trails' })
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @ApiOperation({
    description: 'This api function is to save audit trail',
    summary: 'Create Audit Trail',
  })
  @UseInterceptors(LoggingInterceptor)
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Post()
  public async createAuditTrail(
    @Body() createAuditTrailDto: CreateAuditTrailDto,
  ): Promise<GlobalResponse> {
    return await this.auditTrailService.createAuditTrail(createAuditTrailDto);
  }

  @ApiOperation({
    description: 'This api function is to get audit trail',
    summary: 'Get Audit Trail',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @HttpCode(HttpStatus.OK)
  @Version('1')
  @Get()
  public async getAuditTrails(
    @Query() filerAuditTrailDto: FilterAuditTrailDto,
  ): Promise<any> {
    const { lazyEvent } = filerAuditTrailDto;
    const response = new GlobalResponse();
    response.transaction_classify = 'AUDIT_TRAIL';

    if (!isJSON(lazyEvent)) {
      response.message = 'filters is not a valid json';
      response.payload = {};

      return response;
    }

    const parsedData = JSON.parse(lazyEvent);

    const queryParam: IPrimeDataTable = {
      first: parsedData.first ? parseInt(parsedData.first) : 0,
      rows: parsedData.rows ? parseInt(parsedData.rows) : 20,
      sortField: parsedData.sortField ? parsedData.sortField : 'created_at',
      sortOrder: parsedData.sortOrder ? parseInt(parsedData.sortOrder) : 1,
      filters: parsedData.filters,
    };

    return await this.auditTrailService.getAuditTrails(queryParam);
  }
}
