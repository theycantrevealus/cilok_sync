import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiOAuth2,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Model } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { ExternalBonusLog } from '@/application/models/external-bonus.model';
import { NotificationLog } from '@/application/models/notification.log.model';
import { isJson } from '@/application/utils/JSON/json';
import { Customer } from '@/customer/models/customer.model';
import { Authorization } from '@/decorators/auth.decorator';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { APILog } from '@/logging/models/api.logs.model';
import { ProgramApprovalLog } from '@/program/models/program.approval.log';
import { ProgramV2 } from '@/program/models/program.model.v2';
import { ResendSmsDto } from '@/remedy_tools/dto/resend.sms.dto';
import { RemedyToolsService } from '@/remedy_tools/service/remedy.tools.service';
import { InjectCoupon } from '@/transaction/models/inject.coupon.model';
import { VerificationVoucher } from '@/transaction/models/voucher/verification.voucher.model';

@ApiTags('Remedy Tools')
@Controller({ path: 'remedy-tools', version: '1' })
@UseFilters(RequestValidatorFilterCustom)
export class RemedyToolsController {
  constructor(
    @InjectModel(NotificationLog.name)
    private notificationLogModel: Model<NotificationLog>,
    @InjectModel(ProgramApprovalLog.name)
    private programApprovalLogModel: Model<ProgramApprovalLog>,
    @InjectModel(ProgramV2.name)
    private programv2Model: Model<ProgramV2>,
    @InjectModel(APILog.name)
    private apiLogModel: Model<APILog>,
    @InjectModel(ExternalBonusLog.name)
    private externalLogModel: Model<ExternalBonusLog>,
    @InjectModel(VerificationVoucher.name)
    private verificationVoucher: Model<VerificationVoucher>,
    @InjectModel(InjectCoupon.name)
    private coupon: Model<InjectCoupon>,
    @InjectModel(Customer.name)
    private customerModel: Model<Customer>,
    @InjectModel(Account.name)
    private accountModel: Model<Account>,
    private remedyToolsService: RemedyToolsService,
  ) {}

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('sms_log_prime')
  async smsLogPrime(@Query('lazyEvent') parameter: string, @Req() req) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      delete parsedData.filters.identifier;
      return await this.remedyToolsService.getSmsLogPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        model: this.notificationLogModel,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('api_log_prime')
  async apiLogPrime(@Query('lazyEvent') parameter: string, @Req() req) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.remedyToolsService.getLogPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        model: this.externalLogModel,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('program_log_prime')
  async programApprovalLogPrime(
    @Query('lazyEvent') parameter: string,
    @Req() req,
  ) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.remedyToolsService.getLogPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        model: this.programv2Model,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('coupon_log_prime')
  async couponPrime(@Query('lazyEvent') parameter: string, @Req() req) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      delete parsedData.filters.identifier;

      return await this.remedyToolsService.getLogPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        model: this.coupon,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('voucher_log_prime')
  async verificationVoucherPrime(
    @Query('lazyEvent') parameter: string,
    @Req() req,
  ) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.remedyToolsService.getLogPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        model: this.verificationVoucher,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('subscriber_info_prime')
  async subscriberInfoPrime(@Query('lazyEvent') parameter: string, @Req() req) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.remedyToolsService.getSubscriberInfoPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        search_term: parsedData.search_term,
        auth: req.headers.authorization,
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
  @ApiOperation({
    summary: 'Resend sms',
    description: 'Resend sms',
  })
  @Post('/resend-sms')
  async ResendSms(@Body() parameter: ResendSmsDto) {
    return await this.remedyToolsService.resendSms(parameter);
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('transaction-history-prime')
  async transactionHistoryPrime(
    @Query('lazyEvent') parameter: string,
    @Req() req,
  ) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.remedyToolsService.getTransactionHistoryPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        search_term: parsedData.search_term,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('transaction_log_prime')
  async transactionLogPrime(@Query('lazyEvent') parameter: string, @Req() req) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      delete parsedData.filters.identifier;
      return await this.remedyToolsService.getTransactionLogPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        search_term: parsedData.search_term,
        auth: req.headers.authorization,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }
}
