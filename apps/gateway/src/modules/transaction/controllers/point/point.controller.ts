import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoggingResult } from '@utils/logger/transport';
import * as moment_tz from 'moment-timezone';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { AllExceptionsFilter } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import {
  ViewPointHistoryParamDTO,
  ViewPointHistoryQueryDTO,
} from '@/transaction/dtos/point/point.dto';
import { ApiOperationPoint } from '@/transaction/dtos/point/point.property.dto';
import { TransferPointDto } from '@/transaction/dtos/point/transfer/transfer.point.dto';
import {
  ViewPointParamDTO,
  ViewPointQueryDTO,
} from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import {
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';
import { DeductPoint } from '@/transaction/models/point/deduct.point.model';
import { InjectPoint } from '@/transaction/models/point/inject.point.model';
import { RefundPoint } from '@/transaction/models/point/refund.point.model';
import { PointService } from '@/transaction/services/point/point.service';
import { PointDeductService } from '@/transaction/services/point/point.deduct.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(AllExceptionsFilter)
export class PointController {
  constructor(
    @Inject(PointService) private pointService: PointService,

    @Inject(PointDeductService)
    private pointDeductService: PointDeductService,

    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly clientRefundKafka: ClientKafka,

    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    private readonly clientInjectKafka: ClientKafka,

    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientDeductKafka: ClientKafka,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
  ) {}

  /* Redeem Verification  */
  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation(ApiOperationViewCurrentBalance)
  // @ApiResponse(GlobalTransactionApiResponse.R200)
  // @ApiResponse(GlobalTransactionApiResponse.R400)
  // @ApiResponse(GlobalTransactionApiResponse.R403)
  // @ApiResponse(GlobalTransactionApiResponse.R404)
  // @ApiResponse(GlobalTransactionApiResponse.R405)
  // @ApiResponse(GlobalTransactionApiResponse.R500)
  // @ApiResponse(GlobalTransactionApiResponse.R500)
  // @Version('1')
  // @Post('redeem')
  // async redeem(
  //   @Body() data: Redeem,
  //   @CredentialAccount() account,
  //   @Req() req,
  // ): Promise<GlobalTransactionResponse> {
  //   return await this.redeemService.redeem(data, account);
  // }

  /* Async Inject Point  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.inject)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('point/inject')
  @HttpCode(202)
  async point_inject(
    @Body() data: InjectPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    return await this.pointService.point_inject_api(
      data,
      account,
      req.headers.authorization,
    );
  }

  /* Sync Deduct Point  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.deduct)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('2')
  @Post('point/deduct')
  @HttpCode(200)
  async sync_point_deduct(
    @Body() data: DeductPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    let origin = 'deduct';
    // total_point is not found
    data.total_point = data.total_point ? data.total_point : 0;
    return await this.pointService
      .prepare_payload_deduct(data, account, req)
      .then(async (response) => {
        if (response.code === 'S00000') {
          const logMessage: LoggingResult = {
            step: 'PROCESS DEDUCT',
            message: '-',
          };

          try {
            const process_deduct =
              await this.pointService.proccess_point_deduct_to_core(
                response.payload['payload'],
              );
            logMessage.data = process_deduct.payload;
            if (process_deduct.code == 'S00000') {
              origin = `${origin}.deduct_success`;
              // set log
              logMessage.message = 'Deduct Success';
              // send notification success
              this.pointService.notification_deduct(
                logMessage,
                response?.payload['payload'],
                false,
              );
            } else {
              origin = `${origin}.deduct_fail`;
              // send notification fail
              logMessage.message = 'Deduct Fail';
              this.pointService.notification_deduct(
                logMessage,
                response?.payload['payload'],
              );
            }

            // set origin
            response.payload['payload'].origin = origin;

            // save to transaction master
            this.transactionMasterClient.emit(
              process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
              response.payload['payload'],
            );

            return process_deduct;
          } catch (error) {
            console.log('<--- FAIL :: DEDUCT :: TO CORE --->');
            console.log(error);
            console.log('<--- FAIL :: DEDUCT :: TO CORE --->');

            // unknown error
            response.code = HttpStatusTransaction.UNKNOWN_ERROR;
            response.message = '-';

            logMessage.message = 'FAIL :: DEDUCT :: TO CORE';
            logMessage.data = error;

            // send notification fail
            this.pointService.notification_deduct(
              logMessage,
              response?.payload['payload'],
            );
          }
        }

        delete response.payload['customer'];
        return response;
      })
      .catch((e) => {
        console.log('<-- catch :: fail :: prepare payload deduct -->');
        console.log(e);
        console.log('<-- catch :: fail :: prepare payload deduct -->');
        return e;
      });
  }

  /* Async Deduct Point  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.deduct)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('point/deduct')
  @HttpCode(202)
  async async_point_deduct(
    @Body() data: DeductPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    // total_point is not found
    let endTime: Date;
    const startTime = new Date();
    data.total_point = data.total_point ? data.total_point : 0;

    return await this.pointService
      .point_deduct(data, account, req.headers.authorization)
      .then(async (response) => {
        if (response.code === 'S00000') {
          const json = {
            transaction_classify: 'DEDUCT_POINT',
            origin: 'deduct',
            program: response.payload['program'],
            keyword: response.payload['keyword'],
            customer: response.payload['customer'],
            endpoint: req.url,
            tracing_id: response.payload['trace_id'],
            tracing_master_id: response.payload['trace_id'],
            incoming: data,
            account: account,
            retry: {
              deduct: {
                counter: 0,
                errors: [],
              },
            },
            rule: {
              fixed_multiple: {
                counter: 0,
                counter_fail: 0,
                counter_success: 0,
                message: [],
                status: [],
                transactions: [],
              },
            },
            submit_time: new Date().toISOString(),
            token: req.headers.authorization,
            payload: {
              deduct: response.payload['core'],
            },
          };

          // save to transaction master
          this.transactionMasterClient.emit(
            process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
            json,
          );
          const endTimeTransactionMaster = new Date();
          console.log(
            `NFT_PointController.point_deduct.emit_kafka.transaction_master = ${
              endTimeTransactionMaster.getTime() - startTime.getTime()
            } ms`,
          );

          this.clientDeductKafka.emit(process.env.KAFKA_DEDUCT_TOPIC, json);
          const endTimeDeduct = new Date();
          console.log(
            `NFT_PointController.point_deduct.emit_kafka.deduct = ${
              endTimeTransactionMaster.getTime() - startTime.getTime()
            } ms`,
          );

          endTime = new Date();
          console.log(
            `NFT_PointController.point_deduct = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );
        }
        delete response.payload['customer'];
        return response;
      })
      .catch((e) => {
        return e;
      });
  }

  /* Async Refund Point  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.refund)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('point/refund')
  @HttpCode(202)
  async async_point_refund(
    @Body() data: RefundPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    const moment = require('moment-timezone');
    const now = moment();
    console.log('Start PointRefund - ' + now.format("YYYY-MM-DD HH:mm:ss'SSS"));
    return await this.pointService
      .point_refund(data, account, req.headers.authorization)
      .then(async (response) => {
        if (response.code === 'S00000') {
          const incoming: any = data;
          if (incoming) {
            incoming.point_refund = response?.payload['point_refund'];
          }

          const json = {
            transaction_classify: 'REFUND_POINT',
            origin: 'refund',
            program: response.payload['program'],
            keyword: response.payload['keyword'],
            customer: response.payload['customer'],
            endpoint: req.url,
            tracing_id: response.payload['trace_id'],
            tracing_master_id: response.payload['trace_id'],
            incoming: incoming,
            retry: {
              refund: {
                refund: 0,
                errors: [],
              },
            },
            rule: {
              fixed_multiple: {
                counter: 0,
                counter_fail: 0,
                counter_success: 0,
                message: [],
                status: [],
                transactions: [],
              },
            },
            account: account,
            submit_time: new Date().toISOString(),
            token: req.headers.authorization,
            payload: {
              refund: response.payload['core'],
            },
          };

          // save to transaction master
          let start = moment();
          console.log(
            'Start PointRefund_EMITTRANSMASTER - ' +
              start.format("YYYY-MM-DD HH:mm:ss'SSS"),
          );

          this.transactionMasterClient.emit(
            process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
            json,
          );

          console.log(
            'NFT PointRefund_EMITTRANSMASTER - ' + moment().diff(start),
          );

          start = moment();
          console.log(
            'Start PointRefund_EMITREFUNDKAFKA - ' +
              start.format("YYYY-MM-DD HH:mm:ss'SSS"),
          );

          this.clientRefundKafka.emit(process.env.KAFKA_REFUND_TOPIC, json);

          console.log(
            'NFT PointRefund_EMITREFUNDKAFKA - ' + moment().diff(start),
          );
        }

        delete response.payload['customer'];

        console.log('NFT PointRefund - ' + moment().diff(now));
        return response;
      })
      .catch((e) => {
        return e;
      });
  }

  /* Sync Refund Point  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.refund)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('2')
  @Post('point/refund')
  @HttpCode(200)
  async sync_point_refund(
    @Body() data: RefundPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    let origin = 'refund';
    return await this.pointService
      .prepare_point_refund(data, account, req)
      .then(async (response) => {
        if (response.code === 'S00000') {
          try {
            const process =
              await this.pointService.proccess_point_refund_to_core(
                response.payload['payload'],
              );
            if (process.code == 'S00000') {
              origin = `${origin}.refund_success`;
              process['payload'].ref_transaction_id =
                response.payload?.ref_transaction_id;
              process['payload'].point_refund = response.payload?.point_refund;
              // send notification success
              this.pointService.notification_refund(
                response?.message,
                response.payload['payload'],
                false,
              );
            } else {
              origin = `${origin}.refund_fail`;
              // send notification fail
              this.pointService.notification_refund(
                process['payload']?.error_message,
                response.payload['payload'],
              );
            }

            console.log('<-- refund check #2 -->');
            console.log(process);
            console.log('<-- refund check #2 -->');

            return process;
          } catch (error) {
            console.log('<--- FAIL :: REFUND :: TO CORE --->');
            console.log(error);
            console.log('<--- FAIL :: REFUND :: TO CORE --->');

            // unknown error
            response.code = HttpStatusTransaction.UNKNOWN_ERROR;
            response.message = '-';

            // save to transaction master
            this.transactionMasterClient.emit(
              process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
              response.payload['payload'],
            );
          }
        }
        delete response.payload['customer'];
        return response;
      })
      .catch((e) => {
        console.log('<-- catch :: fail :: prepare payload refund -->');
        console.log(e);
        console.log('<-- catch :: fail :: prepare payload refund -->');

        // const response = new GlobalTransactionResponse();
        // response.code = HttpStatusTransaction.UNKNOWN_ERROR;
        // response.message = '-';
        // response.payload = {
        //   trace_id: '-',
        // };

        return e;
      });
  }

  /* View Current Balance  */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationPoint.view_current_balance)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get(':msisdn/point')
  async current_balance_list(
    @Param() param: ViewPointParamDTO,
    @Query() query: ViewPointQueryDTO,
    @Req() req,
  ): //
  Promise<GlobalTransactionResponse> {
    const data = await this.pointService.new_customer_point_balance(
      param.msisdn,
      query,
      req.headers.authorization,
    );

    if (
      data?.payload['list_of_point'] &&
      data?.payload['list_of_point'].length <= 0
    ) {
      data.payload.list_of_point = [
        {
          total_point: 0,
          expired_date: moment_tz
            .tz('Asia/Jakarta')
            .endOf('year')
            .format('YYYY-MM-DD'),
        },
      ];
    }
    return data;
  }

  /* View Point History */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationPoint.view_point_history)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.limit)
  @ApiQuery(ApiQueryTransaction.skip)
  @ApiQuery(ApiQueryTransaction.from)
  @ApiQuery(ApiQueryTransaction.to)
  @ApiQuery(ApiQueryTransaction.type)
  @ApiQuery(ApiQueryTransaction.bucket_type)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':msisdn/point/history')
  async point_history_list(
    @Param() param: ViewPointHistoryParamDTO,
    @Query() query: ViewPointHistoryQueryDTO,
    @Req() req,
  ) {
    return await this.pointService
      .new_point_history_list(param, query, req.headers.authorization)
      .then((e) => {
        return e;
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });
  }

  /* Sync Deduct Point  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.deduct)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('3')
  @Post('point/deduct')
  @HttpCode(200)
  async sync_point_deduct_v3(
    @Body() data: DeductPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    return await this.pointDeductService.processDeductPointGateway(
      data,
      account,
      req
    )
  }
}
