import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { PostpaidCallbackQueryDTO } from '@/transaction/dtos/callback/callback.dto';
import {
  ApiOperationCallback,
  ApiResponseCallback,
} from '@/transaction/dtos/callback/callback.property.dto';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { ApiQueryTransaction } from '@/transaction/dtos/transaction.property.dto';
import { CallbackTransaction } from '@/transaction/models/callback/callback.transaction.model';
import { CallbackPrepaid } from '@/transaction/models/callback/prepaid.callback.model';
import { CallbackService } from '@/transaction/services/callback/callback.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class CallbackController {
  constructor(private callbackService: CallbackService) {
    //
  }

  /* Callback */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationCallback.callback)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('transactions/callback')
  async transactions_callback(
    @Body() data: CallbackTransaction,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    return await this.callbackService.callback_transaction(data, account);
  }

  /* Callback Provisioning Prepaid Product */
  @ApiOperation(ApiOperationCallback.prepaid)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R401)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @HttpCode(200)
  @Post('transactions/prepaid/callback')
  async transactions_prepaid_callback(
    @Headers() headers,
    @Body() data: CallbackPrepaid,
    @CredentialAccount() account,
  ): Promise<GlobalTransactionResponse> {
    return await this.callbackService.prepaid_callback(headers, data, account);
  }

  /* Callback Provisioning Postpaid Product */
  @ApiOperation(ApiOperationCallback.postpaid)
  @ApiQuery(ApiQueryTransaction.trxid)
  @ApiQuery(ApiQueryTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.orderid)
  @ApiQuery(ApiQueryTransaction.orderstatus)
  @ApiQuery(ApiQueryTransaction.errorcode)
  @ApiQuery(ApiQueryTransaction.errormessage)
  @Version('1')
  @Get('transactions/postpaid/callback')
  async transactions_postpaid_callback(
    @Query() query: PostpaidCallbackQueryDTO,
  ) {
    return await this.callbackService.postpaid_callback(query);
  }
}
