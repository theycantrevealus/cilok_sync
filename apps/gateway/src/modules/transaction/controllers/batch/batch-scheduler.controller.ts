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

import { Account } from '@/account/models/account.model';
import { BatchScheduler } from '@/application/models/batch-scheduler.model';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ApiOperationBatchScheduler,
  ApiQueryBatchScheduler,
  ApiResponseBatchScheduler,
} from '@/transaction/dtos/batch/batch-scheduler-property.dto';
import { BatchSchedulerService } from '@/transaction/services/batch/batch-scheduler.service';

@Controller({ path: 'batch-scheduler' })
@ApiTags('Batch Scheduler Management')
@UseFilters(RequestValidatorFilterCustom)
export class BatchSchedulerController {
  constructor(private batchSchedulerService: BatchSchedulerService) {}

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationBatchScheduler.primeDT) // End Point Description
  @ApiQuery(ApiQueryBatchScheduler.primeDT) // Parameter Query
  @Version('1') // Just add per end point
  @Get()
  async all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.batchSchedulerService.all({
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationBatchScheduler.add)
  @ApiResponse(ApiResponseBatchScheduler.R201)
  @ApiResponse(ApiResponseBatchScheduler.R400)
  @ApiResponse(ApiResponseBatchScheduler.R401)
  @ApiResponse(ApiResponseBatchScheduler.R403)
  @ApiResponse(ApiResponseBatchScheduler.R404)
  @ApiResponse(ApiResponseBatchScheduler.R405)
  @ApiResponse(ApiResponseBatchScheduler.R422)
  @ApiResponse(ApiResponseBatchScheduler.R424)
  @ApiResponse(ApiResponseBatchScheduler.R500)
  @Version('1')
  @Post()
  async add(
    @Body() request: BatchScheduler,
    @CredentialAccount() account: Account,
  ) {
    return await this.batchSchedulerService.add(request, account);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationBatchScheduler.addv2)
  @ApiResponse(ApiResponseBatchScheduler.R200)
  @ApiResponse(ApiResponseBatchScheduler.R400)
  @ApiResponse(ApiResponseBatchScheduler.R401)
  @ApiResponse(ApiResponseBatchScheduler.R403)
  @ApiResponse(ApiResponseBatchScheduler.R404)
  @ApiResponse(ApiResponseBatchScheduler.R405)
  @ApiResponse(ApiResponseBatchScheduler.R422)
  @ApiResponse(ApiResponseBatchScheduler.R424)
  @ApiResponse(ApiResponseBatchScheduler.R500)
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Put(':_id')
  async edit(@Param() parameter, @Body() request: BatchScheduler) {
    return await this.batchSchedulerService.edit(parameter._id, request);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationBatchScheduler.addv2)
  @ApiResponse(ApiResponseBatchScheduler.R204)
  @ApiResponse(ApiResponseBatchScheduler.R400)
  @ApiResponse(ApiResponseBatchScheduler.R401)
  @ApiResponse(ApiResponseBatchScheduler.R403)
  @ApiResponse(ApiResponseBatchScheduler.R404)
  @ApiResponse(ApiResponseBatchScheduler.R405)
  @ApiResponse(ApiResponseBatchScheduler.R422)
  @ApiResponse(ApiResponseBatchScheduler.R424)
  @ApiResponse(ApiResponseBatchScheduler.R500)
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Delete(':_id')
  async delete(@Param() parameter) {
    return await this.batchSchedulerService.delete(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationBatchScheduler.addv2)
  @ApiResponse(ApiResponseBatchScheduler.R204)
  @ApiResponse(ApiResponseBatchScheduler.R400)
  @ApiResponse(ApiResponseBatchScheduler.R401)
  @ApiResponse(ApiResponseBatchScheduler.R403)
  @ApiResponse(ApiResponseBatchScheduler.R404)
  @ApiResponse(ApiResponseBatchScheduler.R405)
  @ApiResponse(ApiResponseBatchScheduler.R422)
  @ApiResponse(ApiResponseBatchScheduler.R424)
  @ApiResponse(ApiResponseBatchScheduler.R500)
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Delete('/batch_id/:_id')
  async deleteData(@Param() parameter) {
    return await this.batchSchedulerService.deleteScheduleByBatchId(
      parameter._id,
    );
  }
}
