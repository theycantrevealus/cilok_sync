import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  formatMsisdnToID,
  msisdnCombineFormatted,
} from '@/application/utils/Msisdn/formatter';
import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { LocationService } from '@/location/services/location.service';
import { StockService } from '@/stock/services/stock.service';
import { VoucherService as TransactionVoucherService } from '@/transaction/services/voucher/voucher.service';

import {
  VoucherBatch,
  VoucherBatchDocument,
} from '@/transaction/models/voucher/voucher.batch.model';
import {
  VoucherImport,
  VoucherImportDocument,
} from '@/transaction/models/voucher/voucher.import.model';
import { Voucher, VoucherDocument } from '@/transaction/models/voucher/voucher.model';
// import {Customer, CustomerDocument} from "@/customer/models/customer.model";
import { MerchantService } from './services/merchant.service';
import { VoucherLogService } from './voucher.log.service';

const FormData = require('form-data');

@Injectable()
export class VoucherService {
  private httpService: HttpService;
  private url: string;
  private branch: string;
  private realm: string;
  private merchant: string;
  private raw_port: number;
  private raw_core: string;

  constructor(
    configService: ConfigService,
    httpService: HttpService,
    private notifService: NotificationContentService,
    private applicationService: ApplicationService,
    private merchantService: MerchantService,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('VOUCHER_SERVICE_PRODUCER')
    private readonly voucherClient: ClientKafka,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly clientRefund: ClientKafka,
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(VoucherBatch.name)
    private voucherBatchModel: Model<VoucherBatchDocument>,
    @InjectModel(VoucherImport.name)
    private voucherImportModel: Model<VoucherImportDocument>,
    // @InjectModel(Customer.name)
    // private customerModel: Model<CustomerDocument>,
    private transactionVoucherService: TransactionVoucherService,
    private stockService: StockService,
    private locationService: LocationService,
    private voucherLogService: VoucherLogService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
  }

  async addVoucher(payload: any) {
    const start = new Date();

    let create,
      notification_code_fail = null;
    const response = new GlobalTransactionResponse();
    const request = payload.payload.voucher.incoming;
    const file = payload.payload.voucher.incoming.file;
    const origin = payload.origin.split('.');

    payload.payload.voucher.core.start_time = new Date().toISOString();
    payload.payload.voucher.core.end_time =
      request.exp_voucher.length > 10
        ? request.exp_voucher
        : this.addDay(request.exp_voucher);

    try {
      payload.payload.voucher.core.prefix =
        payload.payload.voucher.core.prefix == '-'
          ? ''
          : payload?.payload?.voucher?.core?.prefix;
    } catch (error) {
      console.log('Catch :: Handle prefix');
      console.log(error);
      console.log('Catch :: Handle prefix');
    }

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      request,
      `[${payload?.tracing_id}] Init add voucher ...`,
      start,
    );

    console.log(`Current request: `, request);

    if (
      request.voucher_type == 'Generate' &&
      request.stock > 0 &&
      origin[0] == 'voucher'
    ) {
      create = await this.addVoucherBatch(payload);
    } else if (
      request.voucher_type == 'Upload' &&
      file &&
      origin[0] == 'voucher'
    ) {
      create = await this.addVoucherImport(payload);
    } else if (request.stock == 0 && origin[0] == 'redeem') {
      create = await this.addVoucherGenerateUnlimited(payload);

      /** TAKE OUT :: OLD MECHANISM - 2024-08-12**/
      // payload.payload.voucher.core.batch_size = 1;
      // payload.payload.voucher.core.status = 'Redeem';
      // create = await this.addVoucherBatch(payload, false);
    } else if (
      request.voucher_type == 'Generate' &&
      request.stock > 0 &&
      origin[0] == 'redeem'
    ) {
      //Voucher Generate - Stock
      payload.payload.voucher.core.batch_size = 1;
      payload.payload.voucher.core.status = 'Redeem';
      create = await this.getVoucherBatchFromCore(payload);

      /** TAKE OUT :: OLD MECHANISM - 2024-08-08**/
      // create = await this.getVoucherFromCollection(payload);
    } else if (
      request.voucher_type == 'Upload' &&
      request.stock > 0 &&
      origin[0] == 'redeem'
    ) {
      // Voucher Upload - Stock
      payload.payload.voucher.core.status = 'Redeem';
      create = await this.getVoucherUploadFromCore(payload);
    } else {
      response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      response.transaction_classify = 'VOUCHER';
      response.message = 'Voucher type not found or stock < 0';
      response.payload = {};

      this.notification_voucher(response.message, payload, true, {
        is_refund: true,
        reason: 'Voucher process fail',
      });

      await this.voucherLogService.loggerVoucherError(
        payload,
        start,
        `[${payload?.tracing_id}] Error: ${response.message}`,
      );
    }

    if (create) {
      if (create?.code == 'S00000') {
        response.code = create.code;
        response.transaction_classify = 'VOUCHER';
        response.message = create?.message ?? 'Voucher Created Success';

        // set voucher code
        payload.payload.voucher.core.voucher_code =
          create?.payload?.voucher_code;

        this.notification_voucher(response.message, payload, false);

        await this.voucherLogService.loggerVoucherVerbose(
          payload,
          create,
          `[${payload?.tracing_id}] Success add voucher`,
          start,
        );
      } else {
        const label = create?.payload?.label ?? null;
        response.code = create.code;
        response.transaction_classify = 'VOUCHER';
        response.message = create?.message ?? 'Voucher Created Failed';
        response.payload = create?.payload;

        await this.voucherLogService.loggerVoucherVerbose(
          payload,
          payload?.payload?.voucher?.core,
          `[${payload?.tracing_id} - VOUCHER_CONTROLLER] Error code ${
            create?.code
          } -> ${JSON.stringify(response)}`,
          start,
        );

        // TODO : Check voucher stock - 2023-11-19
        if (label == 'NOT_FOUND_FROM_CORE') {
          const rsp_voucher_stock = await this.checkVoucherStock(payload);
          if (!rsp_voucher_stock.status) {
            notification_code_fail = !rsp_voucher_stock.is_stock_ready
              ? NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK
              : null;
          }
        }

        this.notification_voucher(
          response.message,
          payload,
          true,
          {
            is_refund: true,
            reason: 'Voucher process fail',
          },
          notification_code_fail,
        );
      }
    } else {
      await this.voucherLogService.loggerVoucherError(
        payload,
        start,
        `[${payload?.tracing_id}] Error: Data for redeem voucher not found`,
      );

      this.notification_voucher(
        response.message,
        payload,
        true,
        {
          is_refund: true,
          reason: 'Voucher process fail',
        },
        notification_code_fail,
      );
    }

    return response;
  }

  async addVoucherBatch(payload: any, use_cron_job = true) {
    const start = new Date();

    const authToken = payload.token;
    const request = payload.payload.voucher.incoming;
    const corePayload = payload.payload.voucher.core;
    console.log(JSON.stringify(corePayload, null, 2));
    const account = payload.account;
    const origin_split = payload.origin.split('.');

    if (!corePayload.combination) {
      corePayload.combination = 'Alphanumeric';
    }

    corePayload.realm_id = this.realm;
    corePayload.branch_id = this.branch;
    corePayload.merchant_id = this.merchant;
    corePayload.disable_qr = true;
    corePayload.use_cron_job = use_cron_job;

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      corePayload,
      `[${payload?.tracing_id} - VOUCHER_BATCH] Init ...`,
      start,
    );

    return await lastValueFrom(
      this.httpService
        .post(`${this.url}/vouchers/batch`, corePayload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            console.log('SUCCESS_TO_CORE', res.data);

            await this.voucherLogService.loggerVoucherVerbose(
              payload,
              data,
              `[${payload?.tracing_id} - VOUCHER_BATCH] Success request to core`,
              start,
            );

            const maskLength = Number(
              (await this.applicationService.getConfig(
                `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
              )) ?? 5,
            );

            // TODO :: Don't move this code
            const response = new GlobalTransactionResponse();

            response.code = HttpStatusTransaction.CODE_SUCCESS;
            response.message = 'Success';
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: true,
              voucher_code: null,
              end_date: null,
            };

            const voucher_from_core = null;
            // TODO : Checking origin not from "voucher" & batch_size == 1 (voucher without stock)
            if (corePayload.batch_size == 1 && origin_split[0] != 'voucher') {
              console.log(
                'PROGRESS :: REDEEM VOUCHER :: BATCH_NO -->',
                corePayload?.batch_no,
              );

              const where = {
                status: 'Active',
                batch_no: corePayload?.batch_no,
              };

              // Change from status Active to Redeem
              payload.payload.voucher.core.status = 'Redeem';

              try {
                return await this.newSaveToCollectionVoucher(payload, where);
              } catch (error) {
                console.log(
                  '== FAIL :: SAVE TO COLLECTION TRANSACTION VOUCHER (UPLOAD) ==',
                );
                console.log(error);

                response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                response.message = error?.message;
                response.transaction_classify = 'VOUCHER';
                response.payload = {
                  trace_id: false,
                };

                console.log(
                  '== FAIL :: SAVE TO COLLECTION TRANSACTION VOUCHER (UPLOAD) ==',
                );
                return response;
              }

              // if (voucher_from_core) {
              //   console.log('Response From Core --> ', voucher_from_core[0]);
              //   console.log(
              //     'masking ',
              //     this.maskText(
              //       voucher_from_core[0]?.responseBody['voucher_code'],
              //       maskLength,
              //     ),
              //   );

              //   const voucher_code =
              //     voucher_from_core[0]?.need_verification &&
              //     voucher_from_core[0]?.status == 'Redeem'
              //       ? this.maskText(
              //           voucher_from_core[0]?.responseBody?.voucher_code,
              //           maskLength,
              //         )
              //       : voucher_from_core[0]?.responseBody?.voucher_code;

              //   response.payload['voucher_code'] = voucher_code;
              //   response.payload['exp_date'] =
              //     voucher_from_core[0]?.responseBody?.end_time;
              // }
            } else {
              // TODO : Fixing mechanisme save data to collection voucher batch - 2023-11-18
              console.log(
                'PROGRESS :: CREATE VOUCHER BATCH :: BATCH_NO -->',
                corePayload?.batch_no,
              );
              const updateVoucherBatch =
                this.voucherBatchModel.findOneAndUpdate(
                  {
                    keyword_id: payload?.keyword?._id,
                    batch_no: corePayload?.batch_no,
                  },
                  {
                    ...request,
                    insert_done: false,
                    stock: request?.current_stock,
                    keyword_id: payload?.keyword?._id,
                    created_by: account,
                    responseBody: data,
                  },
                  {
                    upsert: true,
                  },
                );

              updateVoucherBatch
                .catch(async (e: BadRequestException) => {
                  await this.voucherLogService.loggerVoucherError(
                    payload,
                    start,
                    `[${payload?.tracing_id} - VOUCHER_BATCH] Error: ${e.message}`,
                    e.stack,
                  );
                  console.log(
                    'FAIL :: CREATE VOUCHER BATCH :: BATCH_NO -> ',
                    corePayload?.batch_no,
                  );
                  console.log('msg --> ', e.message);
                  console.log(
                    'FAIL :: CREATE VOUCHER BATCH :: BATCH_NO -> ',
                    corePayload?.batch_no,
                  );
                })
                .then(async (rsp) => {
                  await this.voucherLogService.loggerVoucherVerbose(
                    payload,
                    response,
                    `[${payload?.tracing_id} - VOUCHER_BATCH] Success insert voucher`,
                    start,
                  );
                  console.log(
                    'SUCCESS :: CREATE VOUCHER BATCH :: BATCH_NO -> ',
                    corePayload?.batch_no,
                  );
                });
            }

            return response;
          }),
          catchError(async (e) => {
            console.log('== RESPONSE ERR GENERATE VOUCHER FROM CORE ==');
            const response = new GlobalTransactionResponse();
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            console.log(e);
            console.log('== RESPONSE ERR GENERATE VOUCHER FROM CORE ==');

            await this.voucherLogService.loggerVoucherError(
              payload,
              start,
              `[${payload?.tracing_id} - VOUCHER_BATCH] Error: ${e?.response?.data.message}`,
              e?.trace,
            );

            return response;
          }),
        ),
    );
  }

  async addVoucherImport(payload: any) {
    const start = new Date();

    const authToken = payload.token;
    const request = payload.payload.voucher.incoming;
    const corePayload = payload.payload.voucher.core;
    const account = payload.account;
    const file = request.file.filename;

    const url = `${this.url}/vouchers/import`;
    const bodyFormData = new FormData();
    bodyFormData.append('type', corePayload.type);
    bodyFormData.append('realm_id', this.realm);
    bodyFormData.append('branch_id', this.branch);
    bodyFormData.append('merchant_id', this.merchant);
    bodyFormData.append('batch_no', corePayload.batch_no);
    bodyFormData.append('start_time', corePayload.start_time);
    bodyFormData.append('end_time', corePayload.end_time);
    bodyFormData.append('status', corePayload.status);
    bodyFormData.append('disable_qr', true);
    bodyFormData.append('file', request.file.data, `./uploads/voucher/${file}`);

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      corePayload,
      `[${payload?.tracing_id} - VOUCHER_IMPORT] Init ...`,
      start,
    );

    return await lastValueFrom(
      this.httpService
        .post(url, bodyFormData, { headers: { Authorization: authToken } })
        .pipe(
          map(async (res) => {
            const data = res.data;
            if (data.code == 'S00000') {
              await this.voucherLogService.loggerVoucherVerbose(
                payload,
                data,
                `[${payload?.tracing_id} - VOUCHER_IMPORT] Success request to core`,
                start,
              );

              // store to local
              const voucherCreation = new this.voucherImportModel({
                ...request,
                keyword_id: payload.keyword._id,
                file: file,
                created_by: account,
                responseBody: data,
              });
              voucherCreation
                .save()
                .then(async (returning) => {
                  // await this.saveToCollectionVoucher(payload);
                  console.log('SUCCESS IMPORT VOUCHER TO CORE');

                  await this.voucherLogService.loggerVoucherVerbose(
                    payload,
                    returning,
                    `[${payload?.tracing_id} - VOUCHER_IMPORT] Success insert voucher`,
                    start,
                  );

                  return returning;
                })
                .catch(async (e) => {
                  await this.voucherLogService.loggerVoucherError(
                    payload,
                    start,
                    `[${payload?.tracing_id} - VOUCHER_IMPORT] Error: ${e.message}`,
                    e?.trace,
                  );
                });
              return data;
            }
          }),
          catchError(async (err: any) => {
            await this.voucherLogService.loggerVoucherError(
              payload,
              start,
              `[${payload?.tracing_id} - VOUCHER_IMPORT] Error: ${err?.response?.data.message}`,
            );

            return err;
          }),
        ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async viewVoucher(payload: any, _filter: any = false) {
    const start = new Date();

    const limit = 1;
    const authToken = payload.token;
    const request = payload.payload.voucher.incoming;
    const corePayload = payload.payload.voucher.core;

    const filter_json =
      _filter == false
        ? {
            status: corePayload.status,
            batch_no: corePayload.batch_no,
          }
        : _filter;

    const filter = encodeURIComponent(JSON.stringify(filter_json));

    const projection_json: any = {
      voucher_code: 1,
    };
    const projection = encodeURIComponent(JSON.stringify(projection_json));

    const sort_json: any = {};
    const sort = encodeURIComponent(JSON.stringify(sort_json));

    const addon_json: any = {};
    const addon = encodeURIComponent(JSON.stringify(addon_json));

    const query = [
      `limit=${request.stock && request.stock > 0 ? request.stock : limit}`,
      `filter=${filter}`,
      `projection=${projection}`,
      `addon=${addon}`,
      `sort=${sort}`,
      `realm_id=${this.realm}`,
      `branch_id=${this.branch}`,
      `merchant_id=${this.merchant}`,
    ];

    console.log(`Checking Filter/Where --> `, _filter);
    console.log(`Checking Url --> ${this.url}/vouchers?${query.join('&')}`);

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      corePayload,
      `[${payload?.tracing_id} - VOUCHER_VIEW] Init ...`,
      start,
    );

    const response = new GlobalTransactionResponse();
    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/vouchers?${query.join('&')}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;

            await this.voucherLogService.loggerVoucherVerbose(
              payload,
              data,
              `[${payload?.tracing_id} - VOUCHER_VIEW] Success request to core`,
              start,
            );

            response.code = data.code;
            response.message = data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              data: data.payload['vouchers'][0]['result'],
              trace_id: false,
            };

            return response;
          }),
          catchError(async (e) => {
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };

            await this.voucherLogService.loggerVoucherError(
              payload,
              start,
              `[${payload?.tracing_id} - VOUCHER_VIEW] Error: ${e?.response?.data.message}`,
            );

            return response;
          }),
        ),
    );
  }

  async saveToCollectionVoucher(payload: any) {
    const start = new Date();

    const incoming = payload.payload.voucher.incoming;
    const deduct = payload.payload.deduct;

    let keyword_verification = '';

    // tracing_id change TRX to VCR
    // let tracing_id = payload.tracing_id.split('_');
    let tracing_id = payload.tracing_id_voucher.split('_');
    tracing_id[0] = 'VCR';
    tracing_id = tracing_id.join('_');

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      incoming,
      `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Init ...`,
      start,
    );

    // Check need verification or not
    let need_verification = false;
    const verify_id = await this.applicationService.getConfig(
      'DEFAULT_ID_VOUCHER_NEED_VERIFICATION', //get id from lov (where set_value : "Keyword Verification")
    );
    if (verify_id) {
      // let check_verify = payload.keyword.notification.filter(e => e.code_identifier.toString() == verify_id);
      const check_verify = payload.keyword.notification.filter(
        (e) => e.code_identifier == verify_id && e.keyword_name != '',
      );
      // console.log('get id for need verification voucher : ', verify_id, ', length : ', check_verify.length)
      if (check_verify.length > 0) {
        need_verification = true;
        keyword_verification = check_verify[0].keyword_name;
      }
      console.log('======= Checking Voucher Verification  =======');
      console.log('1. Voucher Verification ID from LOV : ', verify_id);
      console.log(
        '2. Get verification voucher data in notification field  : ',
        check_verify,
      );
      console.log('3. Result on field need_verification :', need_verification);
      console.log('=============================================');
    }

    const vcr = await this.viewVoucher(payload);
    console.log('Get core voucher', JSON.stringify(vcr, null, 2));
    if (vcr['payload']['data']) {
      let parent_transaction_id = payload.tracing_master_id;
      if (payload?.incoming?.additional_param) {
        const parse_additional_param = payload.incoming.additional_param;

        if (parse_additional_param?.parent_transaction_id) {
          parent_transaction_id = parse_additional_param.parent_transaction_id;
        }
      }

      const data = vcr['payload']['data'].map((e) => ({
        ...e,
        keyword_verification: keyword_verification,
        merchant_id: payload.payload.voucher.incoming.merchant_id
          ? payload.payload.voucher.incoming.merchant_id
          : '',
        merchant_name:
          payload.keyword.eligibility?.merchant_info?.[0]?.merchant_name ?? '',
        msisdn: payload.incoming.msisdn ? payload.incoming.msisdn : '',
        voucher_type: payload.payload.voucher.incoming.voucher_type,
        start_time: e.start_time,
        end_time: e.end_time,
        id: e.id,
        channel_id: deduct?.channel,
        need_verification: need_verification,
        tracing_id: tracing_id,
        master_id: payload.tracing_master_id,
        parent_master_id: parent_transaction_id,
        keyword_id: payload.keyword._id,
        keyword_name: payload.keyword.eligibility.name,
        batch_no: payload.payload.voucher.core.batch_no,
        // created_by: payload.account,
        // responseBody: e,
        created_by: {
          _id: payload.account?._id,
          user_name: payload.account?.user_name,
        },
        responseBody: {
          id: e?.id,
          type: e?.type,
          batch_no: e?.batch_no,
          channel: e?.channel,
          channel_id: e?.channel_id,
          serial_code: e?.serial_code,
          voucher_code: e?.voucher_code,
          create_by_id: e?.create_by_id,
          product_id: e?.product_id,
          realm_id: e?.realm_id,
          branch_id: e?.branch_id,
          merchant_id: e?.merchant_id,
          time: e?.time,
          __v: 0,
        },
      }));

      const newData = this.voucherModel.insertMany(data);
      return await newData
        .catch(async (e: BadRequestException) => {
          await this.voucherLogService.loggerVoucherError(
            payload,
            start,
            `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${e.message}`,
          );

          throw new BadRequestException(e.message);
        })
        .then(async (e) => {
          console.log('SUCCESS SAVE TO COLLECTION');

          await this.voucherLogService.loggerVoucherVerbose(
            payload,
            incoming,
            `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Success save!`,
            start,
          );

          return e;
        });
    } else {
      console.log('Fail fetch data voucher');

      await this.voucherLogService.loggerVoucherError(
        payload,
        start,
        `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Failed to fetch voucher data`,
      );

      return false;
    }
  }

  async getVoucherFromCollection(payload: any) {
    const start = new Date();
    const response = new GlobalTransactionResponse();

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      null,
      `[${payload?.tracing_id_voucher} - VOUCHER_GET_FROM_COLLECTION] Init ...`,
      start,
    );

    return await this.voucherModel
      .findOne({
        status: 'Active',
        keyword_id: payload.keyword._id,
      })
      .limit(1)
      .then(async (rsp) => {
        if (!rsp) {
          console.log(
            `<-- get voucher from local :: ${payload?.tracing_master_id} :: fail - voucher stock is empty  -->`,
          );
          await this.voucherLogService.loggerVoucherError(
            payload,
            start,
            `[${payload?.tracing_id_voucher} - VOUCHER_GET_FROM_COLLECTION] Error: ${response.message}`,
          );

          try {
            console.log(
              '<-- voucher batch/generate :: try get voucher from core -->',
            );
            const rsp = await this.getVoucherBatchFromCore(payload);
            console.log(
              '<-- voucher batch/generate :: try get voucher from core -->',
            );
            console.log('<-- get voucher stock from local  :: fail -->');
            return rsp;
          } catch (error) {
            console.log(
              '<-- voucher batch/generate :: error voucher from func getVoucherBatchFromCore  -->',
            );
            response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            response.message = 'Voucher stock is empty';
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            console.log(error);
            console.log(
              '<-- voucher batch/generate :: error voucher from func getVoucherBatchFromCore  -->',
            );
            console.log(
              `<-- get voucher stock from local  :: ${payload?.tracing_master_id} ::  fail - voucher stock is empty -->`,
            );
            return response;
          }
        }

        const corePayload = payload.payload.voucher.core;
        const deduct = payload.payload.deduct;

        const change = {
          status: 'Redeem',
          start_time: corePayload.start_time,
          end_time: corePayload.end_time,
          msisdn: formatMsisdnToID(payload.incoming.msisdn)
            ? formatMsisdnToID(payload.incoming.msisdn)
            : '',
          master_id: payload.tracing_master_id,
          channel_id: deduct?.channel,
          remark: deduct?.remark,
        };

        const where = {
          status: 'Active',
          id: rsp['responseBody']['id'],
        };

        console.log('=====  OPEN CHECKING VOUCHER UPDATE =====');
        console.log('change', change);
        console.log('where', where);
        console.log('rsp_local_voucher', rsp);
        console.log('=====  CLOSE CHECKING VOUCHER UPDATE =====');

        const maskLength = Number(
          (await this.applicationService.getConfig(
            `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
          )) ?? 5,
        );

        return await this.editVoucher(payload, change, where)
          .then(async (r) => {
            if (r) {
              const updateVoucher = {
                status: change.status,
                start_time: change.start_time,
                end_time: change.end_time,
                msisdn: change.msisdn,
                master_id: change.master_id,
                channel_id: change.channel_id,
                remark: change.remark,
                'responseBody.start_time': change.start_time,
                'responseBody.end_time': change.end_time,
                'responseBody.status': change.status,
              };

              return await this.voucherModel
                .findOneAndUpdate({ id: where.id }, { $set: updateVoucher })
                .then(async (e) => {
                  console.log('update_obj', updateVoucher);
                  console.log('rsp_succ_upd', e);
                  console.log('SUCCESS UPDATE VOUCHER IN COLLECTION');

                  response.code = HttpCodeTransaction.CODE_SUCCESS_200;
                  response.message = 'Success update voucher in collection';
                  response.transaction_classify = 'VOUCHER';

                  console.log(
                    'masking ',
                    this.maskText(e?.responseBody['voucher_code'], maskLength),
                  );

                  const voucher_code =
                    e.need_verification &&
                    (e.status == 'Redeem' || e.status == 'Active')
                      ? this.maskText(
                          e?.responseBody['voucher_code'],
                          maskLength,
                        )
                      : e?.responseBody['voucher_code'];

                  response.payload = {
                    trace_id: false,
                    voucher_code: voucher_code,
                    end_time: e?.responseBody['end_time'],
                  };

                  await this.voucherLogService.loggerVoucherVerbose(
                    payload,
                    updateVoucher,
                    `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] ${response.message}`,
                    start,
                  );

                  return response;
                })
                .catch(async (e) => {
                  console.log('Fail update voucher local : ', e);

                  await this.voucherLogService.loggerVoucherError(
                    payload,
                    start,
                    `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${e.message}`,
                    e?.trace,
                  );

                  response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  response.message = 'Fail update voucher local';
                  response.transaction_classify = 'VOUCHER';
                  response.payload = {
                    trace_id: false,
                  };

                  return response;
                });
            } else {
              response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
              response.message = 'Voucher data from core is not found';
              response.transaction_classify = 'VOUCHER';
              response.payload = {
                trace_id: false,
                label: 'NOT_FOUND_FROM_CORE',
              };

              console.log(response.message);

              await this.voucherLogService.loggerVoucherError(
                payload,
                start,
                `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] ${response.message}`,
              );

              return response;
            }
          })
          .catch(async (error) => {
            console.log(error);

            await this.voucherLogService.loggerVoucherError(
              payload,
              start,
              `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${error.message}`,
              error?.trace,
            );

            response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            response.message = error?.message || 'Cannot update from core';
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };

            return response;
          });
      })
      .catch(async (rsp) => {
        console.log(rsp);

        await this.voucherLogService.loggerVoucherError(
          payload,
          start,
          `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${rsp.message}`,
          rsp?.trace,
        );

        response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        response.message = rsp?.message || 'Cannot update from non-core';
        response.transaction_classify = 'VOUCHER';
        response.payload = {
          trace_id: false,
        };

        return response;
      });
  }

  async getVoucherUploadFromCore(payload: any) {
    const start = new Date();
    const response = new GlobalTransactionResponse();

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      null,
      `[${payload?.tracing_id_voucher} - VOUCHER_GET_FROM_COLLECTION] Init ...`,
      start,
    );

    return await this.voucherImportModel
      .findOne({
        keyword_id: payload.keyword._id,
      })
      .sort({ created_at: -1 })
      .then(async (rsp) => {
        if (!rsp) {
          response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
          response.message = 'Voucher not found in collection voucher_import';
          response.transaction_classify = 'VOUCHER';
          response.payload = {
            trace_id: false,
          };

          await this.voucherLogService.loggerVoucherError(
            payload,
            start,
            `[${payload?.tracing_id_voucher} - VOUCHER_GET_FROM_COLLECTION] Error: ${response.message}`,
          );

          return response;
        }

        const where = {
          status: 'Active',
          batch_no: rsp?.batch_no,
        };

        try {
          payload.payload.voucher.incoming.stock = 1;
          return await this.newSaveToCollectionVoucher(payload, where);
        } catch (error) {
          console.log(
            '== FAIL :: SAVE TO COLLECTION TRANSACTION VOUCHER (UPLOAD) ==',
          );
          console.log(error);

          response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          response.message = error?.message;
          response.transaction_classify = 'VOUCHER';
          response.payload = {
            trace_id: false,
          };

          console.log(
            '== FAIL :: SAVE TO COLLECTION TRANSACTION VOUCHER (UPLOAD) ==',
          );
          return response;
        }
      })
      .catch(async (rsp) => {
        await this.voucherLogService.loggerVoucherError(
          payload,
          start,
          `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${rsp.message}`,
          rsp?.trace,
        );
        console.log(
          '== FAIL :: GET VOUCHER FROM COLLECTION TRANSACTION VOUCHER IMPORT',
        );

        return rsp;
      });
  }

  async getVoucherBatchFromCore(payload: any) {
    const start = new Date();
    const response = new GlobalTransactionResponse();

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      null,
      `[${payload?.tracing_id_voucher} - VOUCHER_GET_FROM_COLLECTION] Init ...`,
      start,
    );

    return await this.voucherBatchModel
      .findOne({
        keyword_id: payload.keyword._id,
      })
      .sort({ created_at: -1 })
      .then(async (rsp) => {
        if (!rsp) {
          response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
          response.message = 'Voucher not found in collection voucher_batch';
          response.transaction_classify = 'VOUCHER';
          response.payload = {
            trace_id: false,
          };

          await this.voucherLogService.loggerVoucherError(
            payload,
            start,
            `[${payload?.tracing_id_voucher} - VOUCHER_GET_FROM_COLLECTION] Error: ${response.message}`,
          );

          return response;
        }

        const where = {
          status: 'Active',
          batch_no: rsp?.batch_no,
        };

        try {
          payload.payload.voucher.incoming.stock = 1;
          return await this.newSaveToCollectionVoucher(payload, where);
        } catch (error) {
          console.log(
            '== FAIL :: SAVE TO COLLECTION TRANSACTION VOUCHER (UPLOAD) ==',
          );
          console.log(error);
          console.log(
            '== FAIL :: SAVE TO COLLECTION TRANSACTION VOUCHER (UPLOAD) ==',
          );
          return error;
        }
      })
      .catch(async (rsp) => {
        await this.voucherLogService.loggerVoucherError(
          payload,
          start,
          `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${rsp.message}`,
          rsp?.trace,
        );
        console.log(
          '== FAIL :: GET VOUCHER FROM COLLECTION TRANSACTION VOUCHER IMPORT',
        );
        console.log(rsp);

        return rsp;
      });
  }

  async newSaveToCollectionVoucher(payload: any, where: any = false) {
    const start = new Date();
    const response = new GlobalTransactionResponse();

    const incoming = payload.payload.voucher.incoming;
    const deduct = payload.payload.deduct;
    const corePayload = payload.payload.voucher.core;
    let end_time,
      voucher_id,
      voucher_code,
      version = null;

    let keyword_verification = '';

    const maskLength = Number(
      (await this.applicationService.getConfig(
        `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
      )) ?? 5,
    );

    // tracing_id change TRX to VCR
    // let tracing_id = payload.tracing_id.split('_');
    let tracing_id = payload.tracing_id_voucher.split('_');
    tracing_id[0] = 'VCR';
    tracing_id = tracing_id.join('_');

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      incoming,
      `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Init ...`,
      start,
    );

    // Check need verification or not
    let need_verification = false;
    const verify_id = await this.applicationService.getConfig(
      'DEFAULT_ID_VOUCHER_NEED_VERIFICATION', //get id from lov (where set_value : "Keyword Verification")
    );
    if (verify_id) {
      // let check_verify = payload.keyword.notification.filter(e => e.code_identifier.toString() == verify_id);
      const check_verify = payload.keyword.notification.filter(
        (e) => e.code_identifier == verify_id && e.keyword_name != '',
      );
      // console.log('get id for need verification voucher : ', verify_id, ', length : ', check_verify.length)
      if (check_verify.length > 0) {
        need_verification = true;
        keyword_verification = check_verify[0].keyword_name;
      }
      console.log('======= Checking Voucher Verification  =======');
      console.log('1. Voucher Verification ID from LOV : ', verify_id);
      console.log(
        '2. Get verification voucher data in notification field  : ',
        check_verify,
      );
      console.log('3. Result on field need_verification :', need_verification);
      console.log('=============================================');
    }

    const vcr = await this.viewVoucher(payload, where);
    if (vcr['payload']['data']) {
      let parent_transaction_id = payload.tracing_master_id;
      if (payload?.incoming?.additional_param) {
        const parse_additional_param = payload.incoming.additional_param;

        if (parse_additional_param?.parent_transaction_id) {
          parent_transaction_id = parse_additional_param.parent_transaction_id;
        }
      }

      const data = vcr['payload']['data'].map((e) => ({
        ...e,
        keyword_verification: keyword_verification,
        merchant_id: payload.payload.voucher.incoming.merchant_id
          ? payload.payload.voucher.incoming.merchant_id
          : '',
        merchant_name:
          payload.keyword.eligibility?.merchant_info?.[0]?.merchant_name ?? '',
        msisdn: payload.incoming.msisdn ? payload.incoming.msisdn : '',
        voucher_type: payload.payload.voucher.incoming.voucher_type,
        start_time: corePayload.start_time,
        end_time: corePayload.end_time,
        id: e.id,
        channel_id: deduct?.channel,
        need_verification: need_verification,
        tracing_id: e?.transaction_no,
        master_id: payload.tracing_master_id,
        parent_master_id: parent_transaction_id,
        keyword_id: payload.keyword._id,
        keyword_name: payload.keyword.eligibility.name,
        remark: deduct?.remark,
        status: corePayload.status,
        __v: e?.__v,
        // created_by: payload.account,
        // responseBody: {
        //   ...e,
        //   status: corePayload.status,
        //   start_time: corePayload.start_time,
        //   end_time: corePayload.end_time,
        //   channel_id: deduct?.channel,
        //   remark: deduct?.remark,
        //   voucher_code: this.transactionVoucherService.removeSpecialCharacter(
        //     e.voucher_code,
        //   ),
        // },
        created_by: {
          _id: payload.account?._id,
          user_name: payload.account?.user_name,
        },
        responseBody: {
          id: e?.id,
          type: e?.type,
          batch_no: e?.batch_no,
          channel: e?.channel,
          channel_id: deduct?.channel,
          serial_code: e?.serial_code,
          voucher_code: this.transactionVoucherService.removeSpecialCharacter(
            e?.voucher_code,
          ),
          create_by_id: e?.create_by_id,
          product_id: e?.product_id,
          realm_id: e?.realm_id,
          branch_id: e?.branch_id,
          merchant_id: e?.merchant_id,
          time: e?.time,
          __v: 0,
        },
      }));

      // set var
      version = data[0]?.__v;
      voucher_id = data[0]?.id;
      where.id = voucher_id;

      voucher_code = this.transactionVoucherService.removeSpecialCharacter(
        data[0]?.responseBody.voucher_code,
      );
      voucher_code =
        need_verification && data[0]?.status == 'Redeem'
          ? this.maskText(voucher_code, maskLength)
          : voucher_code;

      end_time = data[0]?.end_time;

      console.log('=== DATA VOUCHER ===');
      console.log(data);
      console.log('=== DATA VOUCHER ===');

      const change = {
        status: 'Redeem',
        start_time: corePayload.start_time,
        end_time: corePayload.end_time,
        msisdn: formatMsisdnToID(payload.incoming.msisdn)
          ? formatMsisdnToID(payload.incoming.msisdn)
          : '',
        transaction_no: payload.tracing_master_id,
        channel_id: deduct?.channel,
        remark: deduct?.remark,
        __v: version,
      };

      console.log('=====  OPEN CHECKING VOUCHER UPDATE =====');
      console.log('change', change);
      console.log('where', where);
      console.log('=====  CLOSE CHECKING VOUCHER UPDATE =====');

      return await this.editVoucher(payload, change, where)
        .then(async (r) => {
          // r.payload.voucher_code = voucher_code;
          // r.payload.end_time = end_time;

          console.log('== EDIT VOUCHER :: DONE ==');
          console.log(r);
          console.log('== EDIT VOUCHER :: DONE ==');

          if (!r) {
            response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            response.message = 'Voucher data from core is not found';
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
              label: 'NOT_FOUND_FROM_CORE',
            };

            await this.voucherLogService.loggerVoucherError(
              payload,
              start,
              `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] ${response.message}`,
            );

            return response;
          }

          if (r.code == 'S00000') {
            const newData = this.voucherModel.insertMany(data);
            return await newData
              .catch(async (e: BadRequestException) => {
                await this.voucherLogService.loggerVoucherError(
                  payload,
                  start,
                  `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Error: ${e.message}`,
                );

                response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                response.message =
                  e?.message || 'Failed save to collection Voucher';
                response.transaction_classify = 'VOUCHER';
                response.payload = {
                  trace_id: false,
                };

                return response;

                // throw new BadRequestException(e.message);
              })
              .then(async (e) => {
                console.log('SUCCESS SAVE TO COLLECTION VOUCHER');

                await this.voucherLogService.loggerVoucherVerbose(
                  payload,
                  incoming,
                  `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Success save!`,
                  start,
                );

                response.code = HttpCodeTransaction.CODE_SUCCESS_200;
                response.message = 'Success insert to collection voucher';
                response.transaction_classify = 'VOUCHER';
                response.payload = {
                  trace_id: false,
                  voucher_code: voucher_code,
                  end_time: end_time,
                };

                return response;
              });
          } else {
            response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            response.message = r?.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };

            return response;
          }
        })
        .catch(async (error) => {
          console.log('== EDIT VOUCHER :: FAIL ==');
          console.log(error);
          console.log('== EDIT VOUCHER :: FAIL ==');

          response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          response.message =
            error?.message || 'Voucher data from core is not found';
          response.transaction_classify = 'VOUCHER';
          response.payload = {
            trace_id: false,
            label: 'NOT_FOUND_FROM_CORE',
          };

          await this.voucherLogService.loggerVoucherError(
            payload,
            start,
            `[${payload?.tracing_id_voucher} - VOUCHER_EDIT_TO_COLLECTION] ${response.message}`,
          );

          return response;
        });
    } else {
      console.log('Fail fetch data voucher');

      await this.voucherLogService.loggerVoucherError(
        payload,
        start,
        `[${payload?.tracing_id_voucher} - VOUCHER_SAVE_TO_COLLECTION] Failed to fetch voucher data`,
      );
      response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      response.message =
        'Voucher data from core is not found, please check voucher stock';
      response.transaction_classify = 'VOUCHER';
      response.payload = {
        trace_id: false,
        label: 'NOT_FOUND_FROM_CORE',
      };

      return response;
    }
  }

  private maskText(text: string, length: number): string {
    return text?.replace(
      new RegExp(`.{${length}}$`),
      [...Array(length).keys()].map(() => 'X').join(''),
    );
  }

  async patchVoucherById(voucher_id: string, payload: any, obj_change: any) {
    const start = new Date();

    const authToken = payload.token;
    obj_change.merchant_id = this.merchant;
    let projection: any = {};
    projection = encodeURIComponent(JSON.stringify(projection));

    let sort: any = {};
    sort = encodeURIComponent(JSON.stringify(sort));

    let addon: any = {};
    addon = encodeURIComponent(JSON.stringify(addon));

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      obj_change,
      `[${payload?.tracing_id} - VOUCHER_PATCH] Init ...`,
      start,
    );

    const response = new GlobalTransactionResponse();
    return await lastValueFrom(
      this.httpService
        .patch(`${this.url}/vouchers/${voucher_id}`, obj_change, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;

            console.log('SUCCESS EDIT CORE :: VOUCHER');
            console.log(data);
            console.log('SUCCESS EDIT CORE :: VOUCHER');

            await this.voucherLogService.loggerVoucherVerbose(
              payload,
              data,
              `[${payload?.tracing_id} - VOUCHER_PATCH] Success request to core`,
              start,
            );

            response.code = data?.code;
            response.message = data?.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
          catchError(async (e) => {
            console.log(e);

            await this.voucherLogService.loggerVoucherError(
              payload,
              start,
              `[${payload?.tracing_id} - VOUCHER_PATCH] Error: ${e?.response?.data.message}`,
            );

            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };

            return response;
          }),
        ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async editVoucher(payload: any, obj_change: any, where: Object) {
    // return await this.viewVoucher(payload, where)
    //   .then(async (response) => {
    //     if (response['payload']['data']) {
    //       console.log(response['payload']['data']);

    //       const voucher = response['payload']['data'][0];
    //       obj_change.__v = voucher['__v'];
    //       return await this.patchVoucherById(
    //         voucher['id'],
    //         payload,
    //         obj_change,
    //       );
    //     } else {
    //       this.notification_voucher(
    //         'Edit patch failed, cause voucher data is empty',
    //         payload,
    //       );
    //       return false;
    //     }
    //   })
    //   .catch((error) => {
    //     return error;
    //   });

    return await this.patchVoucherById(where['id'], payload, obj_change);
  }

  async notification_voucher(
    message: any,
    payload: any,
    fail = true,
    refund = {
      is_refund: false,
      reason: '',
    },
    notification_code_fail = null,
  ) {
    const start = new Date();
    try {
      if (fail) {
        // payload set origin success
        const origin = payload.origin + '.' + 'voucher_fail';
        payload.origin = origin;
        payload.error_message = message;
        payload.notification = await this.notifService.getNotificationTemplate(
          notification_code_fail
            ? notification_code_fail
            : NotificationTemplateConfig.REDEEM_FAILED_VOUCHER_CODE_NOT_FOUND,
          payload,
        );
      } else {
        // payload set origin success
        const origin = payload.origin + '.' + 'voucher_success';
        payload.origin = origin;
        payload.notification = await this.notifService.getNotificationTemplate(
          NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
          payload,
        );
      }

      if (refund.is_refund) {
        this.refundPoint(payload, refund.reason);
      } else {
        this.notificationClient.emit(
          process.env.KAFKA_NOTIFICATION_TOPIC,
          payload,
        );
      }
    } catch (error) {
      await this.voucherLogService.loggerVoucherVerbose(
        payload,
        {},
        `[${payload?.tracing_id} - VOUCHER_NOTIFICATION] Error -> ${error?.message}`,
        start,
      );
    }
  }

  private addDay(day) {
    const today = new Date();
    const tambahHari = new Date(today.getTime() + day * 24 * 60 * 60 * 1000);
    const tambahHariISO = tambahHari.toISOString();
    return tambahHariISO;
  }

  async refundPoint(payload, refund_reason) {
    const start = new Date();
    try {
      const refund = await this.merchantService
        .getMerchantSelf(payload.token)
        .then((e) => {
          const pin = e?.payload?.merchant_config?.authorize_code?.refund;

          return {
            locale: payload?.payload?.deduct?.locale,
            transaction_no: payload?.payload?.deduct?.transaction_no,
            type: payload?.payload?.deduct?.type,
            // Reason TBC
            reason: refund_reason ? refund_reason : '',
            remark: payload?.payload?.deduct?.remark,
            authorize_pin: pin,
            member_id: payload?.payload?.deduct?.member_id,
            realm_id: payload?.payload?.deduct?.realm_id,
            branch_id: payload?.payload?.deduct?.branch_id,
            merchant_id: payload?.payload?.deduct?.merchant_id,
            __v: 0,
          };
        });

      payload.payload.refund = refund;
      payload.incoming.ref_transaction_id =
        payload?.payload?.deduct?.transaction_no;

      // send to consumer refund
      this.clientRefund.emit(process.env.KAFKA_REFUND_TOPIC, payload);
    } catch (error) {
      await this.voucherLogService.loggerVoucherVerbose(
        payload,
        {},
        `[${payload?.tracing_id} - VOUCHER_REFUND] Error -> ${error?.message}`,
        start,
      );
    }
  }

  // TODO : this function for checking voucher stock - 2023-11-19
  async checkVoucherStock(payload: any) {
    const start = new Date();
    const response = {
      status: false,
      stock: 0,
      is_stock_ready: false,
    };

    try {
      const location_id = payload?.customer?.location_id ?? null;
      const product_id = payload?.product_id ?? null;
      const keyword_id = payload?.keyword?._id.toString() ?? null;

      const getStock = await this.stockService.getStock({
        location: location_id,
        product: product_id,
        keyword: keyword_id,
        qty: 0,
      });

      if (getStock.balance > 0) {
        response.stock = getStock.balance;
        response.status = true;
        response.is_stock_ready = true;
      }

      this.voucherLogService.loggerVoucherVerbose(
        payload,
        null,
        `[${payload?.tracing_id} - CHECK VOUCHER STOCK] Balance = ${response.stock}`,
        start,
      );
    } catch (error) {
      // set default true because cannot get voucher stock
      response.is_stock_ready = true;

      console.log(
        `FAIL :: CHECK_STOCK_VOUCHER :: ${payload?.tracing_master_id}`,
      );
      console.log(error);
      console.log(
        `FAIL :: CHECK_STOCK_VOUCHER :: ${payload?.tracing_master_id}`,
      );

      this.voucherLogService.loggerVoucherError(
        payload,
        null,
        `[${payload?.tracing_id} - FAIL CHECK VOUCHER STOCK] Balance = ${response.stock} --> ${error?.message}`,
        start,
      );
    }

    return response;
  }

  async addVoucherGenerateUnlimited(payload: any) {
    const start = new Date();
    try {
      // Prepare Payload
      const corePayload = await this.payloadToVoucherUnlimited(payload);

      // Push to core
      return await this.pushToCoreVoucher(payload, corePayload);
    } catch (e) {
      await this.voucherLogService.loggerVoucherVerbose(
        payload,
        {},
        `[${
          payload?.tracing_id
        } - VOUCHER_STOCK_UNLIMITED] Global :: An error occured -> Message: ${JSON.stringify(
          e?.message,
        )}`,
        start,
      );

      const response = new GlobalTransactionResponse();
      response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      response.message = e?.message;
      response.transaction_classify = 'VOUCHER';
      response.payload = {
        trace_id: false,
      };

      await this.voucherLogService.loggerVoucherVerbose(
        payload,
        {},
        `[${payload?.tracing_id} - VOUCHER_STOCK_UNLIMITED] Global :: An error occured -> Stack: ${e?.stack}`,
        start,
      );

      return response;
    }
  }

  async payloadToVoucherUnlimited(payload: any) {
    const start = new Date();

    const request = payload.incoming;
    const corePayload = payload.payload.voucher.core;
    const deduct = payload.payload?.deduct;

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      corePayload,
      `[${payload?.tracing_id} - VOUCHER_STOCK_UNLIMITED] Prepare payload - Start`,
      start,
    );

    const msisdn = payload['customer']?.msisdn
      ? payload['customer']?.msisdn
      : request?.msisdn;

    if (!corePayload.combination) {
      corePayload.combination = 'Alphanumeric';
    }

    const data = {
      locale: 'id-ID',
      type: 'Voucher',
      transaction_no: payload['trace_id'],
      batch_no: corePayload.batch_no,
      combination: corePayload.combination,
      prefix: corePayload.prefix,
      status: corePayload.status,
      length: corePayload.length,
      owner_phone: `${msisdnCombineFormatted(msisdn)}|ID|+62`,
      owner_id: payload['customer']?.core_id,
      owner_name: msisdn.replace('62', '0'),
      product_name: corePayload.product_name,
      remark: deduct?.remark,
      desc: corePayload.desc,
      merchant_name: corePayload.merchant_name,
      start_time: corePayload.start_time,
      end_time: corePayload.end_time,
      expiry: {
        expire_type: 'specific',
        expire_specific: corePayload.end_time,
      },
      disable_qr: true,
      product_id: corePayload.product_id,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
    };

    await this.voucherLogService.loggerVoucherVerbose(
      payload,
      corePayload,
      `[${
        payload?.tracing_id
      } - VOUCHER_STOCK_UNLIMITED] Prepare payload - End -> ${JSON.stringify(
        data,
      )}`,
      start,
    );

    return data;
  }

  async needVerification(payload: any) {
    const start = new Date();

    // Check need verification or not
    let need_verification = false;
    let keyword_verification = '';

    const verify_id = await this.applicationService.getConfig(
      'DEFAULT_ID_VOUCHER_NEED_VERIFICATION', //get id from lov (where set_value : "Keyword Verification")
    );

    if (verify_id) {
      const check_verify = payload.keyword.notification.filter(
        (e) => e.code_identifier == verify_id && e.keyword_name != '',
      );

      if (check_verify.length > 0) {
        need_verification = true;
        keyword_verification = check_verify[0].keyword_name;

        await this.voucherLogService.loggerVoucherVerbose(
          payload,
          {},
          `[${payload?.tracing_id} - VOUCHER_STOCK_UNLIMITED] Need verification ? ${need_verification}`,
          start,
        );

        await this.voucherLogService.loggerVoucherVerbose(
          payload,
          {},
          `[${payload?.tracing_id} - VOUCHER_STOCK_UNLIMITED] Keyword verification ? ${keyword_verification}`,
          start,
        );
      }

      console.log('======= Checking Voucher Verification  =======');
      console.log('1. Voucher Verification ID from LOV : ', verify_id);
      console.log(
        '2. Get verification voucher data in notification field  : ',
        check_verify,
      );
      console.log('3. Result on field need_verification :', need_verification);
      console.log('=============================================');
    }

    const response = {
      need_verification: need_verification,
      keyword_verification: keyword_verification,
    };

    return response;
  }

  async pushToCoreVoucher(payload: any, corePayload: any = {}) {
    const start = new Date();
    const token = payload.token;
    const deduct = payload.payload.deduct;

    let voucher_code;

    const responseGlobal = new GlobalTransactionResponse();

    return await lastValueFrom(
      this.httpService
        .post(`${this.url}/vouchers`, corePayload, {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'application/json',
          },
        })
        .pipe(
          map(async (res) => {
            const resPayload = { ...res.data.payload };

            const tempData = { ...res.data }; // Temporary copy for logging
            if (tempData?.payload?.voucher_code) {
              tempData.payload.voucher_code = this.maskText(
                tempData.payload.voucher_code,
                6,
              );
            }

            await this.voucherLogService.loggerVoucherVerbose(
              payload,
              corePayload,
              `[${
                payload?.tracing_id
              } - VOUCHER_STOCK_UNLIMITED] Response from core: ${JSON.stringify(
                tempData,
              )}`,
              start,
            );

            if (res.data.code === 'S00000') {
              // Check if have verification
              const { keyword_verification, need_verification } =
                await this.needVerification(payload);

              // Filtering voucher_code from special character
              voucher_code =
                this.transactionVoucherService.removeSpecialCharacter(
                  resPayload.voucher_code,
                );

              // Masking voucher if need verification & status Redeem
              if (need_verification) {
                const maskLength = Number(
                  (await this.applicationService.getConfig(
                    `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
                  )) ?? 5,
                );

                voucher_code =
                  corePayload.status == 'Redeem'
                    ? this.maskText(voucher_code, maskLength)
                    : voucher_code;
              }

              // save to DB
              const newData = new this.voucherModel({
                keyword_verification: keyword_verification,
                merchant_id: payload?.payload?.voucher?.incoming?.merchant_id || null,
                msisdn: payload.incoming.msisdn ? payload.incoming.msisdn : '',
                voucher_type: payload.payload.voucher.incoming.voucher_type,
                start_time: corePayload.start_time,
                end_time: corePayload.end_time,
                id: resPayload.id,
                channel_id: deduct?.channel,
                need_verification: need_verification,
                tracing_id: payload?.tracing_id,
                master_id: payload.tracing_master_id,
                keyword_id: payload.keyword._id,
                keyword_name: payload.keyword.eligibility.name,
                created_by: payload.account,
                status: corePayload.status,
                responseBody: {
                  id: resPayload?.id,
                  voucher_code: voucher_code,
                  time: payload?.submit_time,
                  start_time: corePayload.start_time,
                  end_time: corePayload.end_time,
                  status: corePayload.status,
                  desc: corePayload.desc,
                  remark: deduct?.remark,
                },
              });

              console.log(corePayload.status);

              return await newData
                .save()
                .then(() => {
                  responseGlobal.code = HttpCodeTransaction.CODE_SUCCESS_200;
                  responseGlobal.message = res.data.message;
                  responseGlobal.transaction_classify = 'VOUCHER';
                  responseGlobal.payload = {
                    trace_id: false,
                    voucher_code: voucher_code,
                    end_time: corePayload.end_time,
                  };

                  return responseGlobal;
                })
                .catch(async (e) => {
                  await this.voucherLogService.loggerVoucherVerbose(
                    payload,
                    corePayload,
                    `[${payload?.tracing_id} - VOUCHER_STOCK_UNLIMITED] Failed to save into non-core db! ${e?.message}`,
                    start,
                  );

                  responseGlobal.code =
                    HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  responseGlobal.message =
                    e?.message ||
                    'Failed save to collection transaction_voucher';
                  responseGlobal.transaction_classify = 'VOUCHER';
                  responseGlobal.payload = resPayload;

                  return responseGlobal;
                });
            } else {
              responseGlobal.code = res.data.code;
              responseGlobal.message = res.data.message;
              responseGlobal.transaction_classify = 'voucher';
              responseGlobal.payload = resPayload;

              await this.voucherLogService.loggerVoucherVerbose(
                payload,
                corePayload,
                `[${payload?.tracing_id} - VOUCHER_STOCK_UNLIMITED] Failed ${res.data.code} from core:  ${res?.data?.message}`,
                start,
              );

              return responseGlobal;
            }
          }),
          catchError(async (e) => {
            await this.voucherLogService.loggerVoucherVerbose(
              payload,
              corePayload,
              `[${
                payload?.tracing_id
              } - VOUCHER_STOCK_UNLIMITED] An error occured: ${JSON.stringify(
                e?.response?.data,
              )}`,
              start,
            );

            const response = new GlobalTransactionResponse();
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
        ),
    );
  }
}
