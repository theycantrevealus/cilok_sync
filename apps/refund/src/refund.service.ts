import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  allowedMSISDN,
  formatMsisdnCore,
  msisdnCombineFormatted
} from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { Stock, StockDocument } from '@/stock/models/stock.model';
import { TransactionMasterService } from '@/transaction/services/transaction_master/transaction_master.service';

import { ExceptionHandler } from '../../utils/logger/handler';
import { IAccount, LoggingData } from '../../utils/logger/transport';
import { RefundPoint, RefundPointDocument } from './model/refund.point.model';

@Injectable()
export class RefundService {
  private httpService: HttpService;
  private customerService: CustomerService;
  private transactionMasterService: TransactionMasterService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;
  constructor(
    @InjectModel(RefundPoint.name)
    private refundPointModel: Model<RefundPointDocument>,
    private applicationService: ApplicationService,
    transactionMasterService: TransactionMasterService,
    customerService: CustomerService,
    httpService: HttpService,
    private configService: ConfigService,
    private notifService: NotificationContentService,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly refundClient: ClientKafka,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @InjectModel(Stock.name)
    private stockModel: Model<StockDocument>,
  ) {
    this.httpService = httpService;
    this.customerService = customerService;
    this.transactionMasterService = transactionMasterService;

    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async point_refund(payload): Promise<GlobalTransactionResponse> {
    const moment = require('moment-timezone');
    const startTime = new Date();
    const request = payload.incoming;
    const account = payload.account;
    const token = payload.token;
    const corePayload = payload.payload.refund;
    const customer_location_id = null;
    const product_id = null;

    console.log(`<== Tracing Log :: @${corePayload.transaction_no} ==>`);

    // try {
    //   const trx = await this.transactionMasterService.getTransactionMasterFindOne({transaction_id : corePayload.transaction_no});
    //   customer_location_id = trx?.customer_location_id;
    //   product_id = trx?.product_id;
    // } catch (error) {
    //   console.log('<-- fail :: getTransactionMasterFindOne -->');
    //   console.log(error)
    //   console.log('<-- fail :: getTransactionMasterFindOne -->');
    // }

    // try {
    //   if(request?.ref_transaction_id){
    //     let channel_transaction_id = request?.ref_transaction_id;
    //     if(!channel_transaction_id.includes('TRX_')){
    //       const trx = await this.transactionMasterService.getTransactionMasterFindOne({channel_transaction_id : channel_transaction_id})
    //       corePayload.transaction_no = trx.transaction_id;
    //     }

    //     console.log(request)
    //   }
    // } catch (error) {
    //   console.log('<--- Fail :: Get TRX  :: Refund Point Service --->');
    //   console.log(error);
    //   console.log('<--- Fail :: Get TRX :: Refund Point Service --->');
    // }

    console.log('<--- Information :: Refund Point Service --->');
    console.log('url_core : ', `${this.url}/transactions/refund`);
    console.log('token : ', token);
    console.log('<--- Information :: Refund Point Service --->');

    const reformatMsisdn = msisdnCombineFormatted(request.msisdn) // check_member_core
    try {
      const data: any = await this.customerService.check_member_core(
        reformatMsisdn,
        token,
        corePayload.reward_item_id,
      );

      corePayload.member_id = corePayload.member_id
        ? corePayload.member_id
        : data?.member_core_id;
    } catch (data_fail) {
      console.log('<-- fatal :: fail check member core -->');

      corePayload.member_id = corePayload.member_id
        ? corePayload.member_id
        : data_fail?.member_core_id;

      console.log(data_fail);

      const endTime = new Date();
      this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload.tracing_id,
        config: this.configService,
        taken_time: startTime.getTime() - endTime.getTime(),
        payload: {
          transaction_id: payload.tracing_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          taken_time: startTime.getTime() - endTime.getTime(),
          method: 'kafka',
          url: 'refund',
          service: 'REFUND',
          step: `REFUND Check Member`,
          param: payload,
          result: {
            msisdn: payload.incoming.msisdn,
            message: 'fail check member core',
            trace: payload.tracing_id,
            user_id: new IAccount(payload.account),
            data: data_fail,
          },
        } satisfies LoggingData,
      });
    }

    console.log('<--- Payload to Core :: Refund Point Service --->');
    console.log(corePayload);
    console.log('<--- Payload to Core :: Refund Point Service --->');

    const start = moment();
    console.log(
      'Start PointRefundKAFKA_GETLASTVALUE - ' +
        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );
    const endTime = new Date();

    return await lastValueFrom(
      this.httpService
        .post(`${this.url}/transactions/refund`, corePayload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            Logger.log(res.status);
            const data = res.data;

            // tracing_id change TRX to RFN
            let tracing_id = payload.tracing_id.split('_');
            tracing_id[0] = 'RFN';
            tracing_id = tracing_id.join('_');

            const newData = new this.refundPointModel({
              ...request,
              remark: corePayload.remark,
              created_by: (account as any)._id,
              responseBody: data,
              tracing_id: tracing_id,
              master_id: payload.tracing_id,
              create_local_time : corePayload?.create_local_time
            });

            const response = new GlobalTransactionResponse();

            console.log(
              'NFT PointRefundKAFKA_GETLASTVALUE - ' + moment().diff(start),
            );

            return await newData
              .save()
              .catch((e: BadRequestException) => {
                throw new BadRequestException(e.message);
              })
              .then(async () => {
                try {
                  // if(customer_location_id && product_id){
                  //   await this.stockModel.findOneAndUpdate(
                  //     {
                  //       keyword: new ObjectId(payload?.keyword?._id),
                  //       location: new ObjectId(customer_location_id),
                  //       product: product_id,
                  //     },
                  //     { $inc: { balance: 1 } },
                  //   );
                  // }else{
                  //   console.log(`<-- fail :: rollbackStock :: ${payload.tracing_master_id} :: START -->`);
                  //   console.log('customer_location_id = ',customer_location_id);
                  //   console.log('product_id = ',product_id);
                  //   console.log(`<-- fail :: rollbackStock :: ${payload.tracing_master_id} :: END -->`);
                  // }

                  await this.exceptionHandler.handle({
                    statusCode: HttpStatus.OK,
                    level: 'verbose',
                    notif_operation: true,
                    notif_customer: false,
                    transaction_id: payload.tracing_id,
                    config: this.configService,
                    taken_time: startTime.getTime() - endTime.getTime(),
                    payload: {
                      transaction_id: payload.tracing_id,
                      statusCode: HttpStatus.OK,
                      taken_time: startTime.getTime() - endTime.getTime(),
                      method: 'kafka',
                      url: 'refund',
                      service: 'REFUND',
                      step: `Success to refund stock`,
                      param: payload,
                      result: {
                        msisdn: payload.incoming.msisdn,
                        message: 'Success to refund stock',
                        trace: payload.tracing_id,
                        user_id: new IAccount(payload.account),
                        data: {},
                      },
                    } satisfies LoggingData,
                  });
                } catch (error) {
                  this.exceptionHandler.handle({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    level: 'error',
                    notif_operation: true,
                    notif_customer: false,
                    transaction_id: payload.tracing_id,
                    config: this.configService,
                    taken_time: startTime.getTime() - endTime.getTime(),
                    payload: {
                      transaction_id: payload.tracing_id,
                      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                      taken_time: startTime.getTime() - endTime.getTime(),
                      method: 'kafka',
                      url: 'refund',
                      service: 'REFUND',
                      step: `Failed to refund stock`,
                      param: payload,
                      result: {
                        msisdn: payload.incoming.msisdn,
                        message: error?.message,
                        trace: payload.tracing_id,
                        user_id: new IAccount(payload.account),
                        data: error,
                      },
                    } satisfies LoggingData,
                  });
                }
                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.transaction_classify = 'REFUND_POINT';
                response.payload = {
                  trace_id: true,
                };
                return response;
              });
          }),
          catchError(async (e) => {
            const response = new GlobalTransactionResponse();
            const rsp = e?.response;

            console.log(
              '<--- Response from Core :: fail :: Refund Point Service --->',
            );
            console.log('Status Code : ', rsp.status);
            console.log('Status Text : ', rsp.statusText);
            console.log('Data : ', rsp.data);
            console.log(
              '<--- Response from Core :: fail :: Refund Point Service --->',
            );

            const endTime = new Date();
            this.exceptionHandler.handle({
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              level: 'error',
              notif_operation: true,
              notif_customer: false,
              transaction_id: payload.tracing_id,
              config: this.configService,
              taken_time: startTime.getTime() - endTime.getTime(),
              payload: {
                transaction_id: payload.tracing_id,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                taken_time: startTime.getTime() - endTime.getTime(),
                method: 'kafka',
                url: 'refund',
                service: 'REFUND',
                step: `REFUND CORE ${e.message}`,
                param: payload,
                result: {
                  msisdn: payload.incoming.msisdn,
                  message: e.message,
                  trace: payload.tracing_id,
                  user_id: new IAccount(payload.account),
                  data: e,
                },
              } satisfies LoggingData,
            });

            response.code =
              rsp.status == 404
                ? HttpStatusTransaction.ERR_NOT_FOUND
                : rsp.status == 500
                ? HttpStatusTransaction.CODE_INTERNAL_ERROR
                : rsp.data.code;
            response.message =
              rsp.status == 404 || rsp.status == 500
                ? rsp.statusText
                : rsp.data.message;
            response.transaction_classify = 'REFUND_POINT';
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
        ),
    );
  }

  async retry_refund(message: any, payload: any) {
    const startTime = new Date();
    const point_stopper_default = 3;

    const origin_fail = payload.origin + '.' + 'refund_fail';
    payload.origin = origin_fail;

    // get config default from config
    this.applicationService
      .getConfig('DEFAULT_CONS_RETRY_REFUND_POINT')
      .then((point_stopper) => {
        point_stopper = point_stopper ? point_stopper : point_stopper_default;

        // if counter refund is more than stopper counter from config
        if (payload.retry.refund.counter >= point_stopper) {
          // send notification cause counter is more than limit
          this.notification_refund(
            'Stopped retrying, the counter is exceeds the limit',
            payload,
          );
        } else {
          // send to consumer refund if condition config counter refund is not fulfilled
          payload.retry.refund.counter += 1; //default counter = 0, counter = counter + 1;
          payload.retry.refund.errors = [
            ...payload.retry.refund.errors,
            message,
          ]; // Joining error messege
          this.refundClient.emit('refund', payload);
        }
      })
      .catch((e) => {
        const endTime = new Date();
        this.exceptionHandler.handle({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          level: 'error',
          notif_operation: true,
          notif_customer: false,
          transaction_id: payload.tracing_id,
          config: this.configService,
          taken_time: startTime.getTime() - endTime.getTime(),
          payload: {
            transaction_id: payload.tracing_id,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            taken_time: startTime.getTime() - endTime.getTime(),
            method: 'kafka',
            url: 'refund',
            service: 'REFUND',
            step: `REFUND ${e.message}`,
            param: payload,
            result: {
              msisdn: payload.incoming.msisdn,
              message: e.message,
              trace: payload.tracing_id,
              user_id: new IAccount(payload.account),
              data: e,
            },
          } satisfies LoggingData,
        });

        this.notification_refund(e.message, payload);
      });
  }

  async notification_refund(message: any, payload: any, fail = true) {
    if (fail) {
      // payload set origin success
      payload.origin = payload.origin + '.' + 'refund_fail';
      payload.error_message = message;
      if (!payload.notification) {
        payload.notification = await this.notifService.getNotificationTemplate(
          'TRX_REFUND_FAILED',
          payload,
        );
      }
    } else {
      // payload set origin success
      payload.origin = payload.origin + '.' + 'refund_success';
      if (!payload.notification) {
        payload.notification = await this.notifService.getNotificationTemplate(
          'TRX_REFUND_SUCCESS',
          payload,
        );
      }
    }

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }
}
