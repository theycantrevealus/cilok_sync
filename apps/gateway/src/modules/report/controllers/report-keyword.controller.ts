import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { isJSON } from 'class-validator';

import { Authorization } from '@/decorators/auth.decorator';
import { ApiQueryExample, ApiResponseExample } from '@/dtos/property.dto';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { ReportFilterDTO } from '../dtos/report-filter.dto';
import { ReportKeyword } from '../models/report-keyword.model';
import { ReportKeywordService } from '../services/report-keyword.service';

@ApiTags('Report Keyword')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
@Controller('report-keyword')
export class ReportKeywordController {
  constructor(private reportKeywordService: ReportKeywordService) {}

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'List Report Keyword',
  })
  @Version('1')
  @Get()
  async list(@Query() filter: ReportFilterDTO) {
    return await this.reportKeywordService.list(filter);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiQuery(ApiQueryExample.primeDT)
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @ApiOperation({
    summary: 'List Report Keyword (Prime)',
  })
  @Version('1')
  @Get('prime')
  async prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.reportKeywordService.prime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Detail Report Keyword Item',
  })
  @Version('1')
  @Get(':_id/detail')
  async detail(@Param() parameter) {
    return await this.reportKeywordService.detail(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Add Report Keyword Item',
  })
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @HttpCode(HttpStatus.ACCEPTED)
  @Version('1')
  @Post()
  async add(@Body() parameter: ReportKeyword) {
    return await this.reportKeywordService.add(parameter);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Report Keyword Item',
  })
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @HttpCode(HttpStatus.OK)
  @Version('1')
  @Put(':_id/edit')
  async edit(@Body() data: ReportKeyword, @Param() param) {
    return await this.reportKeywordService.edit(param._id, data);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Report Keyword Item',
  })
  @ApiResponse(ApiResponseExample.R204)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Version('1')
  @Delete(':_id/delete')
  async delete(@Param() parameter) {
    return await this.reportKeywordService.delete(parameter._id);
  }
}
