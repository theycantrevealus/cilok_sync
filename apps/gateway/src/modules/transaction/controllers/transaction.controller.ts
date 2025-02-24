import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
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
import { TransactionRecoveryService } from '@transaction_master/transaction_recovery.service';

import { Authorization } from '@/decorators/auth.decorator';
import { GlobalResponse } from '@/dtos/response.dto';
// import { RequestValidatorFilter } from '@/filters/validator.filter';
import {
  // RequestValidatorFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { TransactionRecoveryDto } from '@/transaction/dtos/recovery/transaction.recovery.dto';
import {
  ApiOperationTransaction,
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';
import { TransactionService } from '@/transaction/services/transaction.service';

import { ApiQueryEligibilityKeyword } from '../dtos/keyword/keyword.property.dto';
import {
  CheckCustPotentialPointParamDTOParamDTO,
  CheckCustPotentialPointParamDTOQueryDTO,
  CheckTransactionLinkAjaParamDTOQueryDTO,
  CheckTransactionParamDTOParamDTO,
  CheckTransactionParamDTOQueryDTO,
} from '../dtos/transaction.dto';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class TransactionController {
  constructor(
    private transactionService: TransactionService,
    private transactionRecoveryService: TransactionRecoveryService,
  ) {
    //
  }

  /* Check Transaction "Update merubah oauth guard ke basic auth" */
  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(true)
  @ApiOperation(ApiOperationTransaction.check_transaction)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R401)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.ref_transaction_id)
  @ApiQuery(ApiQueryTransaction.sleep)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':msisdn/check-transaction')
  async check_transaction(
    @Headers() headers,
    @Param() param: CheckTransactionParamDTOParamDTO,
    @Query() query: CheckTransactionParamDTOQueryDTO,
  ) {
    return await this.transactionService.check_transaction(
      headers,
      param,
      query,
    );
  }

  /* Check Transaction, this version is use for LinkAja */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationTransaction.check_transaction)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R401)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.ref_transaction_id)
  @ApiQuery(ApiQueryTransaction.sleep)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':msisdn/transaction-status')
  async check_transaction_v2(
    @Headers() headers,
    @Param() param: CheckTransactionParamDTOParamDTO,
    @Query() query: CheckTransactionLinkAjaParamDTOQueryDTO,
  ) {
    return await this.transactionService.check_transaction(
      headers,
      param,
      query,
      true,
      true, // linkaja = true
    );
  }

  /* Check Customer Potential Point.. */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOperation(ApiOperationTransaction.check_transaction)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.city)
  @ApiQuery(ApiQueryTransaction.amount)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':msisdn/potential-point')
  async check_customer_potetial_point(
    @Param() param: CheckCustPotentialPointParamDTOParamDTO,
    @Query() query: CheckCustPotentialPointParamDTOQueryDTO,
  ) {
    return await this.transactionService.check_customer_potetial_point(
      param,
      query,
    );
  }

  /* Check Eligibility Keyword Schedule */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiQuery(ApiQueryEligibilityKeyword.keyword)
  @Version('1')
  @Get(':keyword/eligibility/schedule')
  async check_eligibility_schedule(@Query('keyword') keyword: string) {
    return await this.transactionService.eligibility_check_keyword_schedule(
      keyword,
    );
  }

  /* Check Eligibility Start End Period */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiQuery(ApiQueryEligibilityKeyword.keyword)
  @ApiQuery(ApiQueryEligibilityKeyword.program)
  @Version('1')
  @Get(':keyword/eligibility/period')
  async check_eligibility_period(
    @Query('keyword') keyword: string,
    @Query('program') program: string,
  ) {
    return await this.transactionService.eligibility_check_start_end_period(
      keyword,
      program,
    );
  }

  /* Check Eligibility Start End Period */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @Version('1')
  @Post('transaction/recovery')
  async transactionRecovery(@Body() payload: TransactionRecoveryDto) {
    await this.transactionRecoveryService.runRecoverReports(
      // payload.selected_reports,
      payload.selected_status,
      payload.start_date,
      payload.end_date,
    );

    const response = new GlobalResponse();
    response.transaction_classify = 'TRX_STATISTIC_RECOVERY';
    response.message = 'Success start job transaction statistic';
    response.statusCode = HttpStatus.OK;
    return response;
  }
}
