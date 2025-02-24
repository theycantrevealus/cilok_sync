import { CallApiConfig } from '@configs/call-api.config';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { createHash } from 'crypto';
import mongoose, { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';
import { http } from 'winston';

import {
  ExternalBonusLog,
  ExternalBonusLogDocument,
} from '@/application/models/external-bonus.model';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  formatMsisdnCore,
  formatMsisdnToID,
  ssoFormatToId,
} from '@/application/utils/Msisdn/formatter';
import { allowedIndihomeNumber } from '@/application/utils/Msisdn/formatter';
import { getProductID } from '@/application/utils/Product/product';
import { walkingCheckOriginBefore } from '@/application/utils/Validation/general.validation';
import { CustomerEditDTO } from '@/customer/dto/customer.edit.dto';
import { CustomerService } from '@/customer/services/customer.service';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';
import { StockService } from '@/stock/services/stock.service';
import {
  Donation,
  DonationDocument,
} from '@/transaction/models/donation/donation.model';
import {
  CheckRedeem,
  CheckRedeemDocument,
} from '@/transaction/models/redeem/check.redeem.model';
import { WhitelistService } from '@/transaction/services/whitelist/whitelist.service';

import { ExceptionHandler, LoggingRequest } from '../../utils/logger/handler';
import { IAccount, LoggingData } from '../../utils/logger/transport';
import { TransactionMasterLoggingRequest } from './dtos/transaction_master.logging';

@Injectable()
export class TransactionMasterService {
  private whitelistService: WhitelistService;
  private httpService: HttpService;
  private esbUrlCallback: string;

  constructor(
    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,

    @InjectModel(CheckRedeem.name)
    private checkRedeem: Model<CheckRedeemDocument>,

    @InjectModel(Donation.name)
    private donationModel: Model<DonationDocument>,

    @InjectModel(MerchantV2.name)
    private merchantModel: Model<MerchantV2Document>,

    @InjectModel(ExternalBonusLog.name)
    private externalBonusModel: Model<ExternalBonusLogDocument>,

    httpService: HttpService,
    whitelistService: WhitelistService,
    private callApiConfigService: CallApiConfigService,
    private customerService: CustomerService,
    private stockService: StockService,
    private configService: ConfigService,

    @Inject('REPORTING_STATISTIC_PRODUCER')
    private readonly clientReporting: ClientKafka,

    @Inject('CALLBACK_SERVICE_PRODUCER')
    private readonly clientCallback: ClientKafka,

    @Inject('MULTI_BONUS_SERVICE_PRODUCER')
    private readonly clientMultiBonus: ClientKafka,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(NotificationContentService)
    private readonly notificationContentService: NotificationContentService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    this.httpService = httpService;
    this.whitelistService = whitelistService;
    this.esbUrlCallback = `${configService.get<string>(
      'esb-backend.api.url',
    )}loyalty/redeem/callback`;
  }

  async actTransactionMaster(payload) {
    const startTime = new Date();

    try {
      // process transaction_master
      // set variable
      let trx_data = null;
      let status = 'Fail';
      const origin = payload.origin;
      let transaction_id = payload.tracing_master_id;
      const last_redeemed_date = payload?.submit_time
        ? payload?.submit_time
        : '';
      const customer_id = payload?.customer?._id;
      const account_id = payload.account?._id
        ? payload.account?._id
        : (payload.account as any)?._id;
      const sys_timezone = payload?.program?.program_time_zone;
      const cust_timezone = payload?.customer?.timezone
        ? payload?.customer?.timezone
        : 'WIB';
      let customer_location_id = payload?.customer?.location_id ?? null;
      let keyword_location_id = payload?.keyword_location_id ?? null;
      const channel_transaction_id =
        payload?.incoming?.transaction_id ??
        payload?.incoming?.additional_param?.channel_transaction_id ??
        null;
      const channel_id = payload?.incoming?.channel_id;
      let product_id = payload?.product_id;
      let max_redeemer_id = payload?.maxRedeemer?._id ?? null;
      const notification_code =
        payload?.notification && payload?.notification?.length > 0
          ? payload?.notification[0]?.notification_code
          : '';
      let status_trx = '';
      const keyword_name = payload?.keyword?.eligibility?.name;
      const keyword_verification = payload?.keyword_verification;
      const msisdn = payload['customer']?.msisdn
        ? ssoFormatToId(payload['customer'].msisdn)
        : payload.incoming?.msisdn
        ? ssoFormatToId(payload.incoming?.msisdn)
        : '';
      const program_id = payload?.program?._id ?? null;
      const program_name = payload?.program?.name ?? null;
      const business_id =
        payload?.incoming?.additional_param?.business_id ?? null;
      const transaction_source = payload?.incoming?.transaction_source
        ? payload?.incoming?.transaction_source
        : payload?.incoming?.additional_param?.transaction_source ?? null;

      // parent trx id
      let parent_transaction_id = transaction_id;
      if (payload?.incoming?.additional_param) {
        const parse_additional_param = payload.incoming.additional_param;

        if (parse_additional_param?.parent_transaction_id) {
          parent_transaction_id = parse_additional_param.parent_transaction_id;
        }
      }

      // Flash Sale condition
      let is_flashsale = false;

      if (payload?.is_flashsale) {
        is_flashsale = payload?.is_flashsale;
      }

      if (transaction_id) {
        // get last origin and split by "_"
        const origin_split = origin.split('.');
        const last_origin = origin_split.pop().split('_');
        let cek_status = last_origin[last_origin.length - 1];

        // set trx_data
        try {
          const trx_id_refund =
            payload?.payload?.refund?.transaction_no ?? null;

          // get data trx
          trx_data = await this.trxFindByOne({
            transaction_id: transaction_id,
          });

          if (origin_split[0] == 'refund') {
            const trx_refund = await this.trxFindByOne({
              transaction_id: trx_id_refund,
            });
            max_redeemer_id = max_redeemer_id
              ? max_redeemer_id
              : trx_refund?.max_redeemer_id;
            customer_location_id =
              customer_location_id ?? trx_refund?.customer_location_id;
            keyword_location_id =
              keyword_location_id ?? trx_refund?.keyword_location_id;
            product_id = product_id ?? trx_refund?.product_id;
          }
        } catch (error) {
          console.log('<-- fail :: trxFindByOne -->');
          console.log(error);
          console.log('<-- fail :: trxFindByOne -->');
        }

        // check origin before refund
        if (origin.includes('refund') && origin_split[0] != 'refund') {
          const check_origin_before_refund = walkingCheckOriginBefore(origin);
          if (check_origin_before_refund) {
            console.log(
              `<-- check_origin_before_refund :: ${transaction_id} -->`,
            );
            cek_status = check_origin_before_refund.includes('success')
              ? 'success'
              : 'fail';
            console.log('before_origin_refund = ', check_origin_before_refund);
            console.log('cek_status = ', cek_status);
            console.log(
              `<-- check_origin_before_refund :: ${transaction_id} -->`,
            );
          }
        }

        // check status
        if (cek_status == 'fail' || cek_status == 'failed') {
          status = 'Fail';
        } else if (cek_status == 'success') {
          // if origin is redeem
          if (origin_split[0] == 'redeem') {
            if (payload.customer?.hasOwnProperty('last_redeemed_date')) {
              if (!payload.customer.last_redeemed_date) {
                this.update_customer_last_redeem_date(
                  last_redeemed_date,
                  customer_id,
                );
              } else {
                const date_now = new Date().getFullYear();
                const last_redeem_date = new Date(
                  payload.customer.last_redeemed_date,
                ).getFullYear();
                if (last_redeem_date < date_now) {
                  this.update_customer_last_redeem_date(
                    last_redeemed_date,
                    customer_id,
                  );
                }
              }
            } else {
              this.update_customer_last_redeem_date(
                last_redeemed_date,
                customer_id,
              );
            }
          }

          // set status
          status = 'Success';
        }

        // Rollback donation
        if (status === 'Fail' && payload?.donationCounter) {
          await this.rollbackDonation(payload?.donationCounter, payload);
        }

        // Rollback stock
        if (
          ((status === 'Fail' || cek_status == 'fail') &&
            payload?.is_stock_deducted) ||
          (cek_status == 'success' &&
            customer_location_id &&
            origin_split[0] == 'refund')
        ) {
          // if ((status === 'Fail' && payload?.is_stock_deducted)) {
          await this.rollbackStock(
            payload,
            customer_location_id,
            product_id,
            transaction_id,
            notification_code,
          );
        }

        // refund max redeem if fail
        if (
          ((status === 'Fail' || cek_status == 'fail') && max_redeemer_id) ||
          (cek_status == 'success' &&
            max_redeemer_id &&
            origin_split[0] == 'refund')
        ) {
          if (notification_code !== 'REDEEM_FAILED_MAXREDEEM') {
            await this.refundMaxRedeemer(max_redeemer_id, payload);
          }
          // if ((status === 'Fail' && max_redeemer_id)) {
        }

        // rollback whitelist counter
        if (status === 'Fail' && payload?.is_whitelist_deducted) {
          if (payload.program.whitelist_counter) {
            await this.whitelistService.addCounter(
              payload.program._id,
              payload?.keyword?.eligibility?.name,
              payload?.customer?.msisdn
                ? payload?.customer?.msisdn
                : payload?.incoming?.msisdn
                ? payload?.incoming?.msisdn
                : null,
            );

            payload.is_whitelist_deducted = false;

            console.log(
              '==> ROLLBACK WL COUNTER FOR: ',
              JSON.stringify({
                msisdn: payload.customer?.msisdn,
                program: payload.program._id,
              }),
            );
          }
        }

        // callback
        if (origin_split.length > 1) {
          if (allowedIndihomeNumber(payload?.incoming?.msisdn)) {
            if (
              payload?.incoming?.callback_url === '' ||
              payload?.incoming?.callback_url === undefined
            ) {
              payload.incoming.callback_url = this.esbUrlCallback;
            }
            this.emitToCallback(payload, cek_status);
          } else if (payload?.incoming?.callback_url) {
            this.emitToCallback(payload, cek_status);
          }
        }

        // multi bonus
        if (origin_split.length > 1) {
          const multiBonusPayload = {
            ...payload,
            // parent_master_id: parent_transaction_id,
            parent_transaction_id: parent_transaction_id,
          };

          this.emitToMultibonus(multiBonusPayload, cek_status);
        }

        // custom transaction_id
        const split_trans = transaction_id.split('_');
        split_trans[0] = 'TRX';
        transaction_id = split_trans.join('_');

        if (trx_data && trx_data?.status == 'Partial') {
          const _status =
            cek_status == 'success'
              ? 'Success'
              : cek_status == 'fail'
              ? 'Fail'
              : 'Partial';
          status_trx = `${_status}-${notification_code}`;
          let pointTransaction = 0;
          if (payload?.transaction_classify === 'INJECT_POINT') {
            pointTransaction = payload?.payload?.inject_point?.core?.amount;
          } else {
            pointTransaction = payload?.payload?.deduct?.amount;
          }

          let outbound_error = null;
          if (_status === 'Fail') {
            if (payload?.outbound) {
              if (payload?.outbound?.payload?.transaction?.status_desc) {
                outbound_error =
                  payload?.outbound?.payload?.transaction?.status_desc;
              } else if (payload?.outbound?.payload) {
                outbound_error = payload?.outbound?.payload;
              } else {
                outbound_error = payload?.outbound;
              }
            }
          }

          // update
          const updatePayload = {
            origin: origin,
            status: _status,
            channel_transaction_id: channel_transaction_id,
            channel_id: channel_id,
            cust_timezone: cust_timezone,
            msisdn: msisdn,
            error_code:
              payload?.notification && payload?.notification?.length > 0
                ? payload?.notification[0]?.error_code
                : '',
            customer_location_id: customer_location_id,
            keyword_location_id: keyword_location_id,
            product_id: product_id,
            max_redeemer_id: max_redeemer_id,
            notification_code: notification_code,
            keyword: keyword_name,
            keyword_verification: keyword_verification,
            program: program_id,
            program_name: program_name,
            bonus: payload?.bonus_type,
            type: payload?.transaction_classify,
            poin: pointTransaction,
            error_desc: outbound_error,
            is_flashsale: is_flashsale,
            parent_transaction_id: parent_transaction_id,
            transaction_source: transaction_source,
            business_id: business_id,
          };

          console.log('<== SUCCESS :: UPSERT TRANSACTION #1 ==>');
          console.log('trx_id = ', transaction_id);
          console.log('status_from_collection = ', trx_data?.status);
          console.log('status_payload = ', _status);
          console.log('<== SUCCESS :: UPSERT TRANSACTION #1 ==>');

          // Set Logging Success
          this.logger_transaction_master({
            payload: payload,
            step: 'Step :: Upsert transaction_master #1',
            message:
              'Success upsert transaction_master on condition status partial & trx data is found',
            status_trx: status_trx,
          });

          const ret = await this.updateTransactionMaster(
            transaction_id,
            updatePayload,
          );

          // inject whitelist
          if (status == 'Success' && !payload?.is_keyword_registration) {
            await this.check_and_add_multiwhitelist(payload, transaction_id);
          }

          // inject reporting
          try {
            await this.clientReporting.emit(
              process.env.KAFKA_REPORTING_STATISTIC_TOPIC,
              {
                transaction_status: status,
                ...payload,
              },
            );
          } catch (error) {
            // Set Logging Failed
            this.logger_transaction_master({
              payload: payload,
              step: 'Step :: Emit to consumer topic report_statistic',
              message:
                'Proccess emit to consumer topic report_statistic is failed',
              stack: error?.stack,
              is_success: false,
            });
          }

          return ret;
        } else {
          const _status =
            cek_status == 'success'
              ? 'Success'
              : cek_status == 'fail'
              ? 'Fail'
              : 'Partial';
          status_trx = `${_status}-${notification_code}`;
          let pointTransaction = 0;
          if (payload?.transaction_classify === 'INJECT_POINT') {
            pointTransaction = payload?.payload?.inject_point?.core?.amount;
          } else {
            pointTransaction = payload?.payload?.deduct?.amount;
          }
          // save
          const savePayload = {
            transaction_id: transaction_id,
            origin: origin,
            status: _status,
            msisdn: msisdn,
            channel_transaction_id: channel_transaction_id,
            channel_id: channel_id,
            created_by: account_id,
            error_code:
              payload?.notification && payload?.notification?.length > 0
                ? payload?.notification[0]?.error_code
                : '',
            transaction_date: last_redeemed_date,
            cust_timezone: cust_timezone,
            sys_timezone: sys_timezone,
            customer_location_id: customer_location_id,
            keyword_location_id: keyword_location_id,
            product_id: product_id,
            max_redeemer_id: max_redeemer_id,
            notification_code: notification_code,
            keyword: keyword_name,
            keyword_verification: keyword_verification,
            program: program_id,
            program_name: program_name,
            bonus: payload?.bonus_type,
            type: payload?.transaction_classify,
            poin: pointTransaction,
            is_flashsale: is_flashsale,
            parent_transaction_id: parent_transaction_id,
            transaction_source: transaction_source,
            business_id: business_id,
          };

          console.log('               ');
          if (trx_data && _status != 'Partial') {
            if (trx_data?.status != 'Success') {
              console.log('<== SUCCESS :: UPSERT TRANSACTION #2 ==>');
              console.log(
                'message = status from collection is not success & status incoming is not partial',
              );
              console.log('trx_id = ', transaction_id);
              console.log('status_from_collection = ', trx_data?.status);
              console.log('status_payload = ', _status);
              console.log('<== SUCCESS :: UPSERT TRANSACTION #2 ==>');

              // Set Logging Success
              this.logger_transaction_master({
                payload: payload,
                step: 'Step :: Upsert transaction_master #2',
                message:
                  'Success upsert transaction_master on condition status from collection is not success & status incoming is not partial',
                status_trx: status_trx,
              });

              return await this.saveTransactionMaster(
                transaction_id,
                savePayload,
              );
            } else if (
              trx_data?.status == 'Success' &&
              origin.length > trx_data?.origin.length
            ) {
              console.log('<== SUCCESS :: UPSERT TRANSACTION #3 ==>');
              console.log(
                'message = status from collection is success & origin length more than origin from collection',
              );
              console.log('trx_id = ', transaction_id);
              console.log('status_from_collection = ', trx_data?.status);
              console.log('status_payload = ', _status);
              console.log('<== SUCCESS :: UPSERT TRANSACTION #3 ==>');

              // Set Logging Success
              this.logger_transaction_master({
                payload: payload,
                step: 'Step :: Upsert transaction_master #3',
                message:
                  'Success upsert transaction_master on condition status from collection is success & origin length more than origin from collection',
                status_trx: status_trx,
              });

              return await this.saveTransactionMaster(
                transaction_id,
                savePayload,
              );
            } else {
              console.log('<== FAIL :: UPSERT TRANSACTION #4 ==>');
              console.log('message = origin conditions');
              console.log('trx_id = ', transaction_id);
              console.log('status_from_collection = ', trx_data?.status);
              console.log('status_payload = ', _status);
              console.log('<== FAIL :: UPSERT TRANSACTION #4 ==>');

              // Set Logging Success
              this.logger_transaction_master({
                payload: payload,
                step: 'Upsert transaction_master #4',
                message:
                  'Stop upsert transaction_master, no action for this condition - no issue',
                status_trx: status_trx,
              });
            }
          } else if (!trx_data) {
            console.log('<== SUCCESS :: UPSERT TRANSACTION #5 ==>');
            console.log('message = new data');
            console.log('trx_id = ', transaction_id);
            console.log('status_from_collection = ', 'nil');
            console.log('status_payload = ', _status);
            console.log('<== SUCCESS :: UPSERT TRANSACTION #5 ==>');

            // Set Logging Success
            this.logger_transaction_master({
              payload: payload,
              step: 'Step :: Upsert transaction_master #5',
              message:
                'Success upsert transaction_master on condition new data',
              status_trx: status_trx,
            });

            return await this.saveTransactionMaster(
              transaction_id,
              savePayload,
            );
          } else {
            console.log('<== FAIL :: UPSERT TRANSACTION #6 ==>');
            console.log('message = else condition || not processed');
            console.log('trx_id = ', transaction_id);
            console.log('status_from_collection = ', trx_data?.status);
            console.log('status_payload = ', _status);
            console.log('<== FAIL :: UPSERT TRANSACTION #6 ==>');

            // Set Logging Success
            this.logger_transaction_master({
              payload: payload,
              step: 'Step :: Upsert transaction_master #6',
              message: 'Stop upsert transaction_master - no issue ',
              status_trx: status_trx,
            });
          }
          console.log('               ');
        }
      }
    } catch (error) {
      this.loggingTransactionMaster(payload, error, startTime);
      console.log('<== fail :: actTransactionMaster ==>');
      console.log(error);
      console.log('<== fail :: actTransactionMaster ==>');
    }

    const endTime = new Date();
    console.log(
      `NFT_TransactionMasterService.actTransactionMaster = ${
        endTime.getTime() - startTime.getTime()
      } ms`,
    );
    return false;
  }

  async checkCountTransactionMaster(transaction_id: string) {
    return await this.transactionMasterModel.count({
      transaction_id: transaction_id,
    });
  }

  async saveTransactionMaster(transaction_id: string, payload: object) {
    const startTime = new Date();
    const response: any = {};
    const newData = this.transactionMasterModel.findOneAndUpdate(
      { transaction_id: transaction_id },
      payload,
      {
        upsert: true,
      },
    );
    return await newData
      .catch((e) => {
        this.loggingTransactionMaster(payload, e, startTime);
        response.message = e.message;
        response.status = false;
        response.transaction_classify = 'TRANSACTION_MASTER';
        return response;
      })
      .then(() => {
        response.message = 'Success added';
        response.status = true;
        response.transaction_classify = 'TRANSACTION_MASTER';
        return response;
      });
  }

  async updateTransactionMaster(transaction_id: string, payload: object) {
    const startTime = new Date();
    const response: any = {};
    const updateData = this.transactionMasterModel.findOneAndUpdate(
      { transaction_id: transaction_id },
      payload,
    );
    return updateData
      .catch((e) => {
        this.loggingTransactionMaster(payload, e, startTime);
        response.message = e.message;
        response.status = false;
        response.transaction_classify = 'TRANSACTION_MASTER';
        return response;
      })
      .then(() => {
        response.message = 'Success updated';
        response.status = true;
        response.transaction_classify = 'TRANSACTION_MASTER';
        return response;
      });
  }

  /**
   * Whitelist
   */
  private async check_and_add_multiwhitelist(payload, trx_id) {
    const startTime = new Date();
    try {
      if (payload['customer']) {
        payload['customer']['msisdn'] = payload.customer?.msisdn
          ? ssoFormatToId(payload.customer.msisdn)
          : payload.incoming?.msisdn
          ? ssoFormatToId(payload.incoming.msisdn)
          : '';

        console.log('==== TRANSACTION MASTER MULTIWL OPEN ===');
        console.log(payload['customer']['msisdn']);
        console.log('==== TRANSACTION MASTER MULTIWL CLOSE ===');
      }

      const r = await this.whitelistService.check_and_add_multiwhitelist(
        payload,
        trx_id,
      );

      // Set Logging Success
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: check_and_add_multiwhitelist - Process',
        message: `Is check_and_add_multiwhitelist success ? ${r}`,
      });

      return r;
    } catch (error) {
      // Set Logging Failed
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: check_and_add_multiwhitelist - Failed',
        message: 'Exception check_and_add_multiwhitelist',
        date_now: startTime,
        stack: error?.stack,
        is_success: false,
      });
      // this.loggingTransactionMaster(payload, error, startTime);
    }
  }

  /**
   * Update customer last redeem date
   */
  private async update_customer_last_redeem_date(
    last_redeemed_date: string,
    customer_id: string,
  ) {
    const data = new CustomerEditDTO();
    data.last_redeemed_date = last_redeemed_date;
    console.log(data, customer_id);
    return await this.customerService
      .edit_customer(data, customer_id)
      .then((e) => {
        console.log('update last_redemeed_date success');
      })
      .catch((e) => {
        console.log('update last_redemeed_date failed');
      });
  }

  /**
   * Rolback stock
   */
  private async rollbackStock(
    payload,
    customer_location_id: string = null,
    product_id: string = null,
    transaction_id = '',
    notification_code = '',
  ) {
    const startTime = new Date();
    let productId = product_id;

    try {
      // const product_id = getProductID(payload?.bonus_type, this.configService);

      if (productId == null && payload?.bonus_type == 'direct_redeem') {
        productId = payload?.payload?.direct_redeem?.merchandise;
      }

      console.log('PAYLOAD ROLLBACK STOCK', {
        location: customer_location_id,
        product: productId,
        qty: 1,
        keyword: payload.keyword._id.toString(),
        transaction_id: transaction_id,
        notification_code: notification_code,
        is_flashsale: payload?.is_flashsale || false,
      });

      if (productId && customer_location_id) {
        // console.log('Rollback stock');
        const responseRollback = await this.stockService.rollbackStock(
          {
            location: customer_location_id,
            product: productId,
            qty: 1,
            keyword: payload.keyword._id.toString(),
            transaction_id: transaction_id,
            notification_code: notification_code,
            is_flashsale: payload?.is_flashsale || false,
          },
          payload.account,
        );

        if (responseRollback.code == 'S00000') {
          // Set Logging Success
          this.logger_transaction_master({
            payload: payload,
            step: 'Step :: rollbackStock - Success',
            message: `Is rollbackStock success ? true`,
          });

          //unable flag for rollback stock
          payload.is_stock_deducted = false;
        } else {
          // Set Logging Failed
          this.logger_transaction_master({
            payload: payload,
            step: 'Step :: rollbackStock - Failed',
            message: responseRollback.message,
            date_now: startTime,
            stack: responseRollback?.payload ?? null,
            is_success: false,
          });
        }
      }
    } catch (error) {
      console.log('<-- ROLLBACK STOCK :: FAIL -->');
      console.log(error);
      console.log('<-- ROLLBACK STOCK :: FAIL -->');

      // Set Logging Failed
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: rollbackStock',
        message: 'Exception rollbackStock - Failed',
        date_now: startTime,
        stack: error?.stack,
        is_success: false,
      });
      // this.loggingTransactionMaster(payload, error, startTime);
    }
  }

  /**
   * refund counter max redeemer
   */
  private async refundMaxRedeemer(max_redeemer_id: string, payload: any) {
    const startTime = new Date();
    try {
      console.log('==== REFUND MAX REDEEMER ===');
      console.log('max_redeemer_id : ', max_redeemer_id);
      const paylot = await this.checkRedeem.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(max_redeemer_id),
        },
        { $inc: { counter: -1, __v: 1 }, updated_at: new Date() },
      );
      payload.maxRedeemer.__v = payload?.maxRedeemer?.__v + 1;
      console.log(paylot, 'paylot', 'paylot');
      console.log('==== CLOSE REFUND MAX REDEEMER ===');

      // Set Logging Success
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: refundMaxRedeemer - Process',
        message: `Is refundMaxRedeemer success ? true`,
      });
    } catch (error) {
      // Set Logging Failed
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: refundMaxRedeemer',
        message: 'Exception refundMaxRedeemer - Failed',
        date_now: startTime,
        stack: error?.stack,
        is_success: false,
      });
    }
  }
  /**
   * refund counter donation
   */
  private async rollbackDonation(donation_payload, payload: any) {
    const startTime = new Date();
    try {
      console.log('==== REFUND DONATION QUEUE FAIL ===');
      const paylot = await this.donationModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(donation_payload.incoming._id),
        },
        {
          $inc: {
            donation_queue: -parseInt(donation_payload.total_redeem),
          },
          updated_at: new Date(),
        },
      );
      console.log(paylot, 'paylot', 'paylot');
      console.log('==== CLOSE  REFUND DONATION QUEUE FAIL ===');

      // Set Logging Success
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: rollbackDonation - Process',
        message: `Is rollbackDonation success ? true`,
      });
    } catch (error) {
      // Set Logging Failed
      this.logger_transaction_master({
        payload: payload,
        step: 'Step :: rollbackDonation',
        message: 'Exception rollbackDonation - Failed',
        date_now: startTime,
        stack: error?.stack,
        is_success: false,
      });
    }
  }

  async loggingTransactionMaster(payload, error, start) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: 'error',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.tracing_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      payload: {
        service: TransactionMasterService.name,
        user_id: payload?.account,
        step: 'TransactionMasterService Consumer Service',
        param: payload,
        result: {
          message: error?.message,
          trace: error?.trace,
        },
      } satisfies LoggingData,
    });
  }

  // Logging transaction V.2
  async logger_transaction_master(request: LoggingRequest) {
    // Set Request Validator Logging
    const result_default = {
      message: '-',
      stack: {},
    };

    result_default['message'] = request?.message;
    result_default['stack'] = request?.stack;

    request.payload = request?.payload ?? {};
    request.date_now = request?.date_now ?? Date.now();
    request.is_success = request?.is_success ?? true;
    request.step = request?.step ?? '';
    request.message = request?.message ?? '-';
    request.statusCode =
      request?.statusCode ?? request?.is_success
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
    request.result = request?.result ? request?.result : result_default;
    request.status_trx = request.status_trx ?? '-';
    // Set Request Validator Logging

    const transaction_id = request.payload?.tracing_master_id;
    const account = request.payload?.account;
    const statusCode = request.statusCode;
    const url = request.payload?.endpoint;
    const msisdn = request.payload?.incoming?.msisdn;
    const param = {
      status_trx: request.status_trx,
      origin: request.payload.origin,
      incoming: request.payload?.incoming,
      token: request.payload?.token,
      endpoint: request.payload?.endpoint,
      keyword: {
        eligibility: {
          name: request.payload?.keyword?.eligibility?.name,
          poin_value: request.payload?.keyword?.eligibility?.poin_value,
          poin_redeemed: request.payload?.keyword?.eligibility?.poin_redeemed,
        },
      },
      program: {
        name: request.payload?.program?.name,
      },
      account: account,
      notification: request.payload?.notification,
    };

    const logData: any = {
      method: 'kafka',
      statusCode: statusCode,
      transaction_id: transaction_id,
      notif_customer: false,
      notif_operation: false,
      taken_time: Date.now() - request.date_now,
      step: request.step,
      param: param,
      service: 'TRANSACTION_MASTER',
      result: {
        msisdn: msisdn,
        url: url,
        result: request.result,
      },
    };

    if (request.is_success) {
      this.logger.verbose(logData);
    } else {
      this.logger.error(logData);
    }
  }

  /**
   * find one data from transaction master
   */
  async trxFindByOne(obj: any) {
    return await this.transactionMasterModel.findOne(obj);
  }

  async emitToCallback(payload, status) {
    const start = new Date();
    try {
      // Prepare data
      const url = payload.incoming.callback_url.split('?');
      const targetUrl = url[0];

      const urlParam = new URLSearchParams(url[1]);

      const contentUnParsed = payload.notification
        ? payload?.notification[0]?.template_content
        : '';
      const contentParsed =
        await this.notificationContentService.generateNotificationTemplateFromConsumer(
          contentUnParsed,
          payload,
        );

      const merchant = payload?.keyword?.eligibility?.merchant
        ? await this.merchantModel.findById(
            payload?.keyword?.eligibility?.merchant,
          )
        : null;

      const data = {
        trx_id: payload?.incoming?.transaction_id
          ? payload?.incoming?.transaction_id
          : payload.tracing_master_id,
        msisdn: payload?.incoming?.msisdn,
        channel: payload?.incoming?.channel_id,
        keyword: payload?.incoming?.keyword,
        status: status,
        notif: contentParsed,
        target_url: targetUrl,
        type: urlParam.get('type'),
        submit_time: payload?.submit_time,
        notif_code: payload.notification
          ? payload?.notification[0]?.notification_code
          : '',
        merchant: merchant?.merchant_name,
        total_poin: payload?.payload?.deduct?.amount,
        bonus_type: payload?.bonus_type,
      };
      /**
       * NOTES
       * jika transaksi gagal atau transaksi sukses tapi bonus nya selain telco
       * maka callback langsung di trigger
       */
      if (
        status === 'fail' ||
        (payload?.bonus_type !== 'telco_postpaid' &&
          payload?.bonus_type !== 'telco_prepaid')
      ) {
        this.clientCallback.emit(process.env.KAFKA_CALLBACK_TOPIC, data);
      }
    } catch (error) {
      this.loggingTransactionMaster(payload, error, start);
    }
  }

  async emitToMultibonus(payload, status) {
    const start = new Date();
    try {
      if (status == 'success') {
        const is_refund = payload?.origin?.includes('refund');
        if (is_refund) {
          return false;
        }

        const is_callback = payload?.origin?.includes('outbound');
        if (is_callback) {
          return false;
        }

        const firstOrigin = payload?.origin?.split('.')?.[0];
        if (!['redeem', 'inject_coupon'].includes(firstOrigin)) {
          return false;
        }

        // === MULTIBONUS VALIDATION ===

        // from multibonus? skip
        const is_from_multibonus =
          payload?.incoming?.additional_param?.is_from_multibonus;
        if (is_from_multibonus == true) {
          return false;
        }

        const is_main_keyword = payload?.keyword?.is_main_keyword != false;
        const is_multi_bonus =
          is_main_keyword && payload?.keyword?.child_keyword?.length > 0;
        const keywordType = payload?.keyword?.eligibility?.poin_value;
        const bonusFlexibility = payload?.keyword?.bonus?.[0]?.flexibility;
        const is_async_external_bonus =
          payload?.keyword?.bonus?.filter(
            (e) =>
              e.bonus_type == 'telco_prepaid' ||
              e.bonus_type == 'telco_postpaid',
          )?.length > 0;
        const is_sync_external_bonus =
          payload?.keyword?.bonus?.filter(
            (e) =>
              e.bonus_type == 'ngrs' ||
              e.bonus_type == 'linkaja' ||
              e.bonus_type == 'linkaja_main' ||
              e.bonus_type == 'linkaja_bonus' ||
              e.bonus_type == 'linkaja_voucher',
          )?.length > 0;

        /**
         * Please change all config on:
         * 1. apps\transaction_master\src\transaction_master.service.ts
         * 2. apps\multi_bonus\src\multi_bonus.controller.ts
         * --
         * 2024/11/26 - First version
         */
        let validEmitToMultibonus = false;
        if (is_multi_bonus) {
          validEmitToMultibonus = true;
        } else {
          if (
            (['Flexible', 'Fixed Multiple'].includes(keywordType) ||
              ['Fixed', 'Flexible'].includes(bonusFlexibility)) &&
            !is_async_external_bonus &&
            !is_sync_external_bonus
          ) {
            validEmitToMultibonus = true;
          }
        }

        if (validEmitToMultibonus) {
          this.clientMultiBonus.emit(
            process.env.KAFKA_MULTI_BONUS_TOPIC,
            payload,
          );

          return true;
        }
        // === END MULTIBONUS VALIDATION ===

        // this.clientMultiBonus.emit(
        //   process.env.KAFKA_MULTI_BONUS_TOPIC,
        //   payload,
        // );
      }
    } catch (error) {
      this.loggingTransactionMaster(payload, error, start);
    }
  }
}
