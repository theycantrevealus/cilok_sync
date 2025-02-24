import { CallApiConfig } from '@configs/call-api.config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Parser } from 'csv-parse';
import { createReadStream } from 'fs';
import mongoose, { Error, FilterQuery, Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';
import { Logger } from 'winston';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { VoucherBatchDto } from '@/transaction/dtos/voucher/voucher.batch.dto';
import { VoucherCheckUpdateDTO } from '@/transaction/dtos/voucher/voucher.check.update.dto';
import {
  AccumulateVoucherDTO,
  CheckStockVoucherImportOrBatchDTO,
  GetMsisdnRedeemerByVoucherCodeParamDTO,
  VoucherDTO,
  VoucherDTOResponse,
  VoucherTaskResultDTO,
} from '@/transaction/dtos/voucher/voucher.dto';
import {
  VoucherListParamDTO,
  VoucherListQueryDTO,
} from '@/transaction/dtos/voucher/voucher-list.dto';
import {
  VerificationVoucher,
  VerificationVoucherDocument,
} from '@/transaction/models/voucher/verification.voucher.model';
import {
  VoucherBatch,
  VoucherBatchDocument,
} from '@/transaction/models/voucher/voucher.batch.model';
import {
  VoucherImport,
  VoucherImportDocument,
} from '@/transaction/models/voucher/voucher.import.model';
import {
  Voucher,
  VoucherDocument,
} from '@/transaction/models/voucher/voucher.model';
const moment = require('moment-timezone');

import { ObjectId } from 'bson';
import { ObjectID } from 'bson';
import * as FormData2 from 'form-data';

import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { VoucherStockSummaryDTO } from '@/transaction/dtos/voucher/voucher.stock.summary';
import {
  VoucherTask,
  VoucherTaskDocument,
} from '@/transaction/models/voucher/voucher.task.model';
import { VoucherUpdateService } from '@/transaction/services/voucher/voucher.update.service';

@Injectable()
export class VoucherService {
  private product: string;
  private voucher_product: string;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private httpService: HttpService;
  callApiConfigService: any;

  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,

    @InjectModel(Voucher.name, 'secondary')
    private voucherModelSecondary: Model<VoucherDocument>,

    @InjectModel(VerificationVoucher.name)
    private verificationVoucherModel: Model<VerificationVoucherDocument>,

    configService: ConfigService,
    private transactionOptional: TransactionOptionalService,

    @Inject('VOUCHER_SERVICE_PRODUCER')
    private readonly clientVoucherKafka: ClientKafka,

    @InjectModel(VoucherBatch.name)
    private voucherBatchModel: Model<VoucherBatchDocument>,

    @InjectModel(VoucherImport.name)
    private voucherImportModel: Model<VoucherImportDocument>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    private applicationService: ApplicationService,
    httpService: HttpService,

    callApiConfigService: CallApiConfigService,

    private readonly voucherUpdateService: VoucherUpdateService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ConfigService) private readonly configService2: ConfigService,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @InjectModel(VoucherTask.name)
    private voucherTaskModel: Model<VoucherTaskDocument>,
  ) {
    this.callApiConfigService = callApiConfigService;
    this.httpService = httpService;
    this.product = `${configService.get<string>('core-backend.product.id')}`;
    this.voucher_product = configService.get<string>(
      'core-backend.voucher_product.id',
    );
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
  }

  async getMsisdnByVoucherCode(
    param: GetMsisdnRedeemerByVoucherCodeParamDTO,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    const voucher = await this.voucherModel.findOne({
      'responseBody.voucher_code': param.voucher_code,
    });

    if (!voucher) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Voucher Code is not found' },
      ]);
    }

    const pipeline = [
      {
        $match: {
          'responseBody.voucher_code': param.voucher_code,
        },
      },
      {
        $project: {
          _id: 0,
          msisdn: 1,
        },
      },
    ];

    const data = await this.voucherModel.aggregate(pipeline);

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = data[0];
    return response;
  }

  async voucher_verification(
    request: VerificationVoucher,
    account: Account,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    const newData = new this.verificationVoucherModel({
      ...request,
      created_by: account,
    });

    return await newData
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(async () => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = 'VOUCHER_VERIFICATION';
        response.payload = {
          transaction_id: '1234',
          voucher_code: 'voucher-12345',
          msisdn: newData.msisdn,
          merchant_id: newData.merchant_id,
          trace_id: 'true',
          voucher_value: 25000,
          account_id: '2a4189ae-d69b-4005-874f-0982e4ad489e',
          transaction_value: 100000,
          transaction_date: '2022-12-22T16:59:59.999Z',
        };
        return response;
      });
  }

  async voucherWithKeyword(
    keyword: Keyword,
    account: Account,
    req: any,
    edit_keyword = false,
    stock_add = null,
    new_method = false,
  ): Promise<any> {
    // Incoming

    // create remark
    const _eligibility = keyword?.eligibility;
    const remark = [
      _eligibility?.program_title_expose
        ? _eligibility?.program_title_expose
        : '',
      _eligibility.name,
      _eligibility?.program_experience
        ? _eligibility?.program_experience.toString()
        : '',
    ].join('|');

    const incoming = new VoucherDTO();
    const date = new Date();
    const voucher = keyword.bonus.filter(
      (e) => e.bonus_type == 'discount_voucher',
    );

    if (voucher.length > 0) {
      const data = voucher[0];
      let voucher_exisitng = null;

      // TODO : Fixing batch no - 2023-11-18
      let batch_no = `${_eligibility?.name}_${keyword['_id']}`;
      // let stock = data['stock_location']
      //   ? data['stock_location'].reduce((acc, item) => acc + item.stock, 0)
      //   : 0;

      // TODO : Fixing stock keyword - voucher
      const acc_stock_after = data['stock_location']
        ? data['stock_location'].reduce((acc, item) => acc + item.stock, 0)
        : 0;

      // const acc_stock_before = data['stock_location']
      //   ? data['stock_location'].reduce(
      //     (acc, item: any) => acc + item?.balance ?? 0,
      //     0,
      //   )
      //   : 0;

      // stock =
      //   acc_stock_before > 0
      //     ? acc_stock_after - acc_stock_before
      //     : acc_stock_after;

      // console.log('CHECKING :: STOCK KEYWORD ::  BATCH_NO --> ', batch_no);
      // console.log({
      //   stock_after: acc_stock_after,
      //   stock_before: acc_stock_before,
      //   real_stock_update: stock,
      // });
      // console.log('CHECKING :: STOCK KEYWORD ::  BATCH_NO --> ', batch_no);

      try {
        if (data['voucher_type'].toLowerCase() == 'upload') {
          voucher_exisitng = await this.getVoucherImportByKeywordId(
            keyword['_id'],
          );
        } else if (data['voucher_type'].toLowerCase() == 'generate') {
          voucher_exisitng = await this.getVoucherBatchByKeywordId(
            keyword['_id'],
          );
        }

        if (voucher_exisitng?.length > 0) {
          batch_no = voucher_exisitng?.batch_no ?? batch_no;
        }
      } catch (error) {
        console.log(
          'CATCH :: CHECKING VOUCHER EXISTING :: BATCH_NO --> ',
          batch_no,
        );
        console.log(error);
        console.log(
          'CATCH :: CHECKING VOUCHER EXISTING :: BATCH_NO --> ',
          batch_no,
        );
      }

      incoming.batch_no = batch_no;
      incoming.stock = stock_add ?? acc_stock_after;
      incoming.current_stock = acc_stock_after;
      incoming.keyword_id = keyword['_id'];
      incoming.keyword_name = keyword.eligibility.name;
      incoming.combination = data['voucher_combination'];
      incoming.digit_length = data['jumlah_total_voucher'];
      incoming.prefix = data['voucher_prefix'];
      incoming.voucher_type = data['voucher_type'];
      incoming.file = data['file'];
      incoming.exp_voucher = data['exp_voucher'];
      incoming.type = incoming.stock > 0 ? 'stock' : 'non_stock';

      if (incoming.stock < 0) {
        console.log('Cannot proccessing, voucher stock < 0');
        return false;
      }

      incoming.merchant_id = keyword.eligibility.merchant;

      const voucher_desc = keyword?.eligibility?.program_title_expose
        ? keyword?.eligibility?.program_title_expose
        : '';

      const voucher_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_product_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_PRODUCT_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_type = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_TYPE', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_merchant_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_MERCHANT_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      // Payload to Core
      const corePayload = new VoucherBatchDto();
      corePayload.locale = 'id-ID';
      corePayload.batch_no = incoming.batch_no;
      corePayload.batch_size = incoming.stock;
      corePayload.type = voucher_type ? voucher_type : 'Product';
      corePayload.name = voucher_name
        ? voucher_name
        : 'Product Voucher Telkomsel';
      corePayload.status = 'Active';
      corePayload.product_name = voucher_product_name
        ? voucher_product_name
        : `Product Voucher Telkomsel`;
      corePayload.prefix = incoming.prefix;
      corePayload.combination = incoming.combination;
      corePayload.desc = voucher_desc;
      corePayload.remark = remark;
      corePayload.merchant_name = voucher_merchant_name
        ? voucher_merchant_name
        : 'Telkomsel';
      corePayload.product_id = this.product;
      corePayload.length = incoming.digit_length;
      // corePayload.start_time = new Date();
      // corePayload.end_time = incoming.exp_voucher.length > 10 ? new Date(incoming.exp_voucher) : incoming.exp_voucher;
      // corePayload.end_time = incoming.exp_voucher.length > 0 ? new Date(incoming.exp_voucher) : new Date(this.addDay(incoming.exp_voucher));

      const response = new VoucherDTOResponse();
      if (
        incoming.voucher_type == 'Generate' ||
        (incoming.voucher_type == 'Upload' && incoming.file)
      ) {
        if (incoming.voucher_type == 'Upload' && incoming.file) {
          // to get this function need async
          corePayload.batch_size = await this.countDataFileCsv(
            `./uploads/voucher/${incoming.file.filename}`,
          );
          incoming.stock = corePayload.batch_size;
        }

        response.code = HttpCodeTransaction.CODE_SUCCESS_200;
        response.transaction_classify = 'Voucher Creation';
        response.message = 'Voucher Created Successfully';
        const trace_id = this.transactionOptional.getTracingId(
          incoming,
          response,
        );
        response.payload = {
          trace_id: trace_id,
        };

        const tracing_id_voucher =
          this.transactionOptional.getTracingIdWithLength(
            25,
            incoming,
            response,
          );

        const json = {
          transaction_classify: 'VOUCHER',
          origin: 'voucher',
          program: {},
          keyword: keyword,
          customer: {},
          endpoint: req.url,
          tracing_id: trace_id,
          tracing_id_voucher: tracing_id_voucher,
          incoming: {},
          account: account,
          submit_time: new Date().toISOString(),
          token: req.headers.authorization,
          payload: {
            voucher: {
              incoming: incoming,
              core: corePayload,
            },
          },
        };

        if (incoming.voucher_type == 'Upload' && incoming.file) {
          // const authToken = payload.token;
          json['payload']['voucher']['core']['start_time'] = new Date();
          json['payload']['voucher']['core']['end_time'] =
            incoming.exp_voucher?.length > 10
              ? new Date(incoming.exp_voucher)
              : this.addDay(incoming.exp_voucher);

          const resVoucherImport = await this.addVoucherImport(
            json,
            new_method,
          );
          console.log('RES IMPORT', resVoucherImport);

          response.payload = resVoucherImport;
          response.transaction_classify = 'Voucher Import';

          if (resVoucherImport?.code == 'S00000') {
            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.message = 'Voucher Imported';
          } else {
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            response.message = 'Unable To Import Voucher';
          }

          return response;
        } else {
          const emit = await this.clientVoucherKafka.emit(
            process.env.KAFKA_VOUCHER_TOPIC,
            json,
          );
          emit.subscribe((e) => {
            if (response.payload) {
              delete response.payload;
            }
          });
        }
      } else {
        response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        response.transaction_classify = 'Voucher Creation';
        response.message = 'Voucher type not found';
        response.payload = {};
      }
      return response;
    }
  }

  private addDay(day) {
    const today = new Date();
    const tambahHari = new Date(today.getTime() + day * 24 * 60 * 60 * 1000);
    // const tambahHariISO = tambahHari.toISOString();
    return tambahHari;
  }

  private async logVoucher(start, payload, step, error = false) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: error ? 'error' : 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.tracing_id,
      config: this.configService2,
      taken_time: start.getTime() - end.getTime(),
      statusCode: HttpStatus.OK,
      payload: {
        transaction_id: payload?.tracing_id,
        statusCode: error ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
        method: 'kafka',
        url: 'voucher',
        service: 'VOUCHER-IMPORT',
        step: step,
        param: payload,
        result: {
          statusCode: error ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
          level: error ? 'error' : 'verbose',
          message: step,
          trace: payload?.tracing_id,
          msisdn: payload?.incoming?.msisdn,
          user_id: new IAccount(payload.account),
        },
      } satisfies LoggingData,
    });
  }

  async addVoucherImport(payload: any, new_method = false) {
    const start = new Date();

    const authToken = payload.token;
    const request = payload.payload.voucher.incoming;
    const corePayload = payload.payload.voucher.core;
    const account = payload.account;
    const file = request.file.filename;

    const url = `${this.url}/vouchers/import`;

    // FormData 1
    // const bodyFormData = new FormData();
    // bodyFormData.append('type', corePayload.type);
    // bodyFormData.append('realm_id', this.realm);
    // bodyFormData.append('branch_id', this.branch);
    // bodyFormData.append('merchant_id', this.merchant);
    // bodyFormData.append('batch_no', corePayload.batch_no);
    // bodyFormData.append('start_time', corePayload.start_time);
    // bodyFormData.append('end_time', corePayload.end_time);
    // bodyFormData.append('status', corePayload.status);
    // bodyFormData.append('disable_qr', 'true');

    // const binaryBuffer = Buffer.from(request.file.base64, 'base64');
    // const fileBlob = new Blob([binaryBuffer], {
    //   type: request.file.mimetype,
    // });
    // bodyFormData.append('file', fileBlob, `./uploads/voucher/${file}`);

    // console.log('PAYLOADNYA NIH', bodyFormData);

    // FormData 2
    const bodyFormData2 = new FormData2();
    bodyFormData2.append('type', corePayload.type);
    bodyFormData2.append('realm_id', this.realm);
    bodyFormData2.append('branch_id', this.branch);
    bodyFormData2.append('merchant_id', this.merchant);
    bodyFormData2.append('batch_no', corePayload.batch_no);
    bodyFormData2.append('start_time', corePayload.start_time?.toISOString());
    bodyFormData2.append('end_time', corePayload.end_time?.toISOString());
    bodyFormData2.append('status', corePayload.status);
    bodyFormData2.append('disable_qr', 'true');
    bodyFormData2.append('file', createReadStream(request.file.path));

    const remark = payload?.keyword?.eligibility?.name ?? '';
    bodyFormData2.append('remark', remark);

    console.log('INIT', bodyFormData2);
    await this.logVoucher(start, bodyFormData2, `Init ...`);

    return await lastValueFrom(
      this.httpService
        .post(url, bodyFormData2, {
          headers: {
            Authorization: authToken,
            'Content-Type': 'multipart/form-data',
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            if (data.code == 'S00000') {
              console.log('SUKSES REQ');
              await this.logVoucher(
                start,
                {
                  req: bodyFormData2,
                  res: data,
                },
                'Success request to core',
              );

              // check if data exist? (edit)
              const oldData = await this.voucherImportModel.findOne({
                keyword_id: payload.keyword._id,
              });

              if (oldData) {
                await this.voucherImportModel
                  .updateOne(
                    { _id: oldData._id },
                    {
                      responseBody: data,
                      insert_done: false,
                      stock: request.stock,
                    },
                  )
                  .then(async (returning) => {
                    console.log('SUCCESS UPDATE IMPORT VOUCHER');

                    await this.logVoucher(
                      start,
                      returning,
                      'Success update import voucher',
                    );

                    return returning;
                  })
                  .catch(async (e) => {
                    console.error('GAGAL UPDATE', e);

                    await this.logVoucher(
                      start,
                      {
                        req: bodyFormData2,
                        res: e,
                      },
                      `Failed update import voucher: ${e?.message}`,
                      true,
                    );
                  });
                // update
              } else {
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
                    // console.log('SUKSES SAVE');
                    // await this.saveToCollectionVoucher(payload);
                    console.log('SUCCESS CREATE IMPORT VOUCHER');

                    await this.logVoucher(
                      start,
                      returning,
                      'Success create import voucher',
                    );

                    return returning;
                  })
                  .catch(async (e) => {
                    console.log('GAGAL CREATE', e);
                    // throw new BadRequestException([
                    //   { isInvalidDataContent: `${e?.message}` },
                    // ]);

                    await this.logVoucher(
                      start,
                      {
                        req: bodyFormData2,
                        res: e,
                      },
                      `Failed create import voucher: ${e?.message}`,
                      true,
                    );
                  });
              }

              if (new_method) {
                const newAccountObject = { ...account };
                delete newAccountObject.core_payload;

                await this.voucherTaskModel.create({
                  keyword_id: payload?.keyword?._id,
                  task_id: data?.payload?.id,
                  batch_no: corePayload.batch_no,
                  filename: request?.file?.original_filename,
                  created_by: newAccountObject,
                  status: 'Waiting',
                  total_record: 0,
                  total_success: 0,
                  total_fail: 0,
                  type: 'upload',
                  accumulate_stock: 0,
                  __v: 0,
                });
              }

              return data;
            }
          }),
          catchError(async (err: any) => {
            console.log('GAGAL IMPORT', err);
            await this.logVoucher(
              start,
              {
                req: bodyFormData2,
                res: err,
              },
              `Failed import voucher: ${err?.response?.data?.message}`,
              true,
            );

            return err;
          }),
        ),
    );
  }

  protected async countDataFileCsv(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 1;
      // Buat stream untuk membaca file CSV
      const stream = createReadStream(filePath);

      // Buat parser untuk mengolah data CSV
      const parser = new Parser({});

      // Tambahkan listener untuk setiap baris yang dibaca
      parser.on('data', () => {
        count++;
      });

      // Tambahkan listener untuk event end untuk menyelesaikan proses pembacaan
      parser.on('end', () => {
        // Kembalikan jumlah baris yang dibaca
        const c = count - 1;
        resolve(c);
        return c;
      });

      // Mulai membaca file CSV
      stream.pipe(parser);
    });
  }

  async voucher_detail(filter: FilterQuery<VoucherDocument>): Promise<any> {
    const voucher = await this.voucherModel.findOne(filter);
    if (!voucher) return null;

    return JSON.parse(JSON.stringify(voucher));
  }

  // lama
  async voucher_list_old(
    paramDto: VoucherListParamDTO,
    queryDto: VoucherListQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const skip = Number(queryDto.skip ?? 0);
    const limit = Number(
      queryDto.limit && queryDto.limit != 0 ? queryDto.limit : 100,
    );
    let filters = {};

    if (queryDto.filter) {
      filters = JSON.parse(queryDto.filter);
      filters = {
        ...filters,
        voucher_status: this.unConvertVoucherStatus(filters['voucher_status']),
      };
      filters = JSON.stringify(filters);
    }

    const match = {
      msisdn: paramDto.msisdn,
      master_id: queryDto.transaction_id ?? /.*/,
      $or: ['Redeem', 'Verified'].map((status) => ({ status })),
    };

    if (queryDto?.channel_id) {
      match['responseBody.channel'] = queryDto.channel_id;
    }

    const query: any = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: 'transaction_verification_voucher',
          let: { voucher_code: '$responseBody.voucher_code' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$voucher_code', '$$voucher_code'] }],
                },
              },
            },
            {
              $project: {
                created_at: 1,
              },
            },
          ],
          as: 'voucher_verification',
        },
      },
      {
        $unwind: {
          path: '$voucher_verification',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const filter_builder = { $and: [] };
    const filterSet = filters as any;

    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allData = await this.voucherModel.aggregate(query, (err, result) => {
      if (err) {
        console.error(err);
      }
      return result;
    });

    query.push({ $skip: skip });
    query.push({ $limit: limit });

    const data = await this.voucherModel.aggregate(query, (err, result) => {
      if (err) {
        console.error(err);
      }
      return result;
    });

    const maskLength = Number(
      (await this.applicationService.getConfig(
        `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
      )) ?? 0,
    );
    const response = new GlobalTransactionResponse();
    // response.transaction_classify = 'VOUCHER_LIST';
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = {
      total_record: allData.length,
      page_size: data.length,
      page_number: skip == 0 ? 1 : allData.length / skip,
      list_of_voucher: data.map((item) => {
        const status = item.status;
        const voucher_code = this.convertVoucherStatus(
          item.responseBody.voucher_code,
        );

        return {
          transaction_id: item.master_id,
          keyword_redeem: item.keyword_name,
          voucher_status: status,
          // Mask "Voucher Code" if voucher need to be verified.
          voucher_code:
            item.need_verification && item.status == 'Redeem'
              ? this.maskText(voucher_code, maskLength)
              : voucher_code,
          voucher_desc: item.responseBody.desc,
          redeemed_date: this.convertDate(item.responseBody.time),
          verified_date: this.convertDate(item?.verified_date),
          expired_date: this.convertDate(item.responseBody.end_time),
        };
      }),
    };
    return response;
  }

  private getTime(start) {
    const end = Date.now();
    return `Execution time: ${end - start} ms`;
  }

  async voucher_list(
    //baru
    paramDto: VoucherListParamDTO,
    queryDto: VoucherListQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const s1 = Date.now();
    console.log('=== Voucher List start ===');
    console.log('| Msisdn: ', paramDto.msisdn);

    const skip = Number(queryDto.skip ?? 0);
    const limit = Number(
      queryDto.limit && queryDto.limit != 0 ? queryDto.limit : 100,
    );
    const filters = queryDto.filter;

    if (queryDto.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than 1' },
      ]);
    } else if (queryDto.limit == 0) {
      const configLimit = await this.callApiConfigService.callConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      queryDto.limit = configLimit ? configLimit : 5;
    }

    if (queryDto.skip < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Skip Must be a Non-Negative Number' },
      ]);
    }
    const match: any = {
      msisdn: paramDto.msisdn,
      // master_id: queryDto.transaction_id ?? /.*/,
      $or: ['Redeem', 'Verified'].map((status) => ({ status })),
      deleted_at: null,
      end_time: {
        $gte: moment().utc().toDate(),
      },
    };

    // if (queryDto?.channel_id) {
    //   match['responseBody.channel'] = queryDto.channel_id;
    // }

    // const today = new Date();
    // const threeMonthsAgo = new Date(
    //   today.getFullYear(),
    //   today.getMonth() - 3,
    //   today.getDate(),
    // );

    // const endDate = new Date();

    // match['start_time'] = {
    //   $gte: threeMonthsAgo,
    //   $lte: endDate,
    // };

    const s2 = Date.now();

    if (filters) {
      const filterParse = JSON.parse(filters);

      // Filter based on voucher_status
      if (filterParse.hasOwnProperty('voucher_status')) {
        match['status'] = this.unConvertVoucherStatus(
          filterParse['voucher_status'],
        );
      }

      // Filter based on keyword_redeem
      if (filterParse.hasOwnProperty('keyword_redeem')) {
        match['keyword_name'] = filterParse['keyword_redeem'];
      }

      // Filter based on expired_date
      if (filterParse.hasOwnProperty('expired_date')) {
        match['end_time'] = {
          $gte: new Date(filterParse['expired_date']),
          $lte: new Date(filterParse['expired_date']),
        };
      }

      // Filter based on verfied date
      if (filterParse.hasOwnProperty('verified_date')) {
        match['verified_date'] = {
          $gte: new Date(filterParse['verified_date']),
          $lte: new Date(filterParse['verified_date']),
        };
      }

      // Filter range date on redeemed_date
      if (typeof filterParse['redeemed_date'] == 'object') {
        if (
          filterParse['redeemed_date'][0] &&
          filterParse['redeemed_date'][1]
        ) {
          if (
            filterParse['redeemed_date'][0] == filterParse['redeemed_date'][1]
          ) {
            const date = new Date(filterParse['redeemed_date'][1]);
            match['start_time'] = {
              $gte: new Date(filterParse['redeemed_date'][0]),
              $lt: new Date(date.setDate(date.getDate() + 1)),
            };
          } else {
            match['start_time'] = {
              $gte: new Date(filterParse['redeemed_date'][0]),
              $lte: new Date(filterParse['redeemed_date'][1]),
            };
          }
        }
      } else {
        // Filter based on redeemed_date
        if (filterParse.hasOwnProperty('redeemed_date')) {
          match['start_time'] = {
            $gte: new Date(filterParse['redeemed_date']),
            $lte: new Date(filterParse['redeemed_date']),
          };
        }
      }
    }

    const query: any = [
      {
        $match: match,
      },
      // TODO : Cross check to Pak Anjar for purposes
      // {
      //   $lookup: {
      //     from: 'transaction_verification_voucher',
      //     let: { voucher_code: '$responseBody.voucher_code' },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [{ $eq: ['$voucher_code', '$$voucher_code'] }],
      //           },
      //         },
      //       },
      //       {
      //         $project: {
      //           created_at: 1,
      //         },
      //       },
      //     ],
      //     as: 'voucher_verification',
      //   },
      // },
      // {
      //   $unwind: {
      //     path: '$voucher_verification',
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
    ];

    const filter_builder = { $and: [] };
    const filterSet = filters as any;

    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const condition = {};
        if (filterSet[a].matchMode === 'contains') {
          condition[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          condition[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          condition[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          condition[a] = {
            $eq: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'notEquals') {
          condition[a] = {
            $ne: filterSet[a].value,
          };
        }

        filter_builder.$and.push(condition);
      }
    }
    console.log('| Query Builder (filter): ', this.getTime(s2));

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const s3 = Date.now();

    const isPaginationTotalDataEnable = await this.applicationService.getConfig(
      CallApiConfig.PAGINATION_TOTAL_DATA,
    );
    console.log('isPaginationTotalDataEnable', isPaginationTotalDataEnable);
    let allData = [];
    if (isPaginationTotalDataEnable) {
      allData = await this.voucherModelSecondary.aggregate(
        [
          ...query,
          {
            $count: 'all',
          },
        ],
        (err, result) => {
          if (err) {
            console.error(err);
          }
          return result;
        },
      );
    }
    console.log('allData', allData);

    const dataCount = allData.length > 0 ? allData[0].all : 0;

    query.push({ $skip: skip });
    query.push({ $limit: limit });

    // console.log(query);

    const data = await this.voucherModelSecondary.aggregate(
      query,
      (err, result) => {
        if (err) {
          console.error(err);
        }
        return result;
      },
    );

    console.log('| Query:', this.getTime(s3));
    console.log('=== QUERY ===', JSON.stringify(query));
    const maskLength = Number(
      (await this.applicationService.getConfig(
        `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
      )) ?? 0,
    );

    const s4 = Date.now();

    const response = new GlobalTransactionResponse();
    // response.transaction_classify = 'VOUCHER_LIST';
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = {
      total_record: dataCount,
      page_size: data.length,
      page_number: isPaginationTotalDataEnable
        ? skip == 0
          ? 1
          : dataCount / skip
        : 0,
      list_of_voucher: data.map((item) => {
        const status = this.convertVoucherStatus(item.status);
        const voucher_code = item.responseBody.voucher_code;

        return {
          transaction_id: item.master_id,
          keyword_redeem: item.keyword_name,
          voucher_status: status,
          // Mask "Voucher Code" if voucher need to be verified.
          voucher_code:
            item.need_verification && item.status == 'Redeem'
              ? this.maskText(voucher_code, maskLength)
              : voucher_code,
          voucher_desc: item.responseBody.desc,
          redeemed_date: this.convertDate(item?.start_time),
          verified_date: this.convertDate(item?.verified_date),
          expired_date: this.convertDate(item?.end_time),
        };
      }),
    };

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Voucher List End ===');

    return response;
  }

  async voucherCheckUpdate(req: VoucherCheckUpdateDTO, token: string) {
    const response = new GlobalTransactionResponse();
    const payload: any = {
      token: token,
      filter: {},
      projection: {},
      sort: {},
      addon: {},
      limit: req.limit ? req.limit : 500,
      skip: 0,
      voucher: null,
      keyword: {},
    };
    let keyword_verification = '';
    let need_verification = false;
    const verify_id = await this.applicationService.getConfig(
      'DEFAULT_ID_VOUCHER_NEED_VERIFICATION', //get id from lov (where set_value : "Keyword Verification")
    );

    if (req.type == 'batch') {
      payload.voucher = await this.voucherBatchModel
        .findOne({ insert_done: false })
        .sort({ created_at: 1 })
        .limit(1);
    } else if (req.type == 'upload') {
      payload.voucher = await this.voucherImportModel
        .findOne({ insert_done: false })
        .sort({ created_at: 1 })
        .limit(1);
    }

    if (!payload.voucher) {
      response.transaction_classify = 'VOUCHER';
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = 'Not found voucher to update';
      return response;
    }

    // set skip
    payload.skip = payload.voucher.total_insert;
    payload.filter = {
      status: payload.voucher.status,
      batch_no: payload.voucher.batch_no,
    };
    payload.projection = {
      voucher_code: 1,
    };

    // get keyword
    payload.keyword = await this.keywordModel.findById(
      payload.voucher.keyword_id,
    );

    // Proses insert to colleciton
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

    const vcr = await this.viewVoucherFromCore(payload);
    if (vcr['payload']['data']) {
      const data_core = vcr['payload']['data'].map((e) => ({
        ...e,
        keyword_verification: keyword_verification,
        merchant_id: this.merchant,
        voucher_type: payload.voucher.voucher_type,
        start_time: e.start_time,
        end_time: e.end_time,
        id: e.id,
        need_verification: need_verification,
        keyword_id: payload.keyword._id,
        keyword_name: payload.keyword.eligibility.name,
        batch_no: payload.voucher.batch_no,
        created_by: payload.voucher.account,
        responseBody: e,
      }));

      // set total_insert
      const total_insert: number =
        payload.voucher.total_insert + data_core.length;

      const newData = this.voucherModel.insertMany(data_core);
      return await newData
        .catch((e: BadRequestException) => {
          throw new BadRequestException(e.message);
        })
        .then(async (e) => {
          console.log('SUCCESS SAVE TO COLLECTION TRANSACTION_VOUCHER');
          console.log('total insert : ', data_core.length);

          if (req.type == 'batch') {
            await this.voucherBatchModel
              .findByIdAndUpdate(payload.voucher._id, {
                insert_done:
                  payload.voucher.stock == total_insert ? true : false,
                total_insert: total_insert,
              })
              .then((e) => {
                console.log('success update voucher batch', e);
              })
              .catch((e) => {
                console.log('failed update voucher batch', e);
                response.transaction_classify = 'VOUCHER';
                response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
                response.message = 'failed update voucher batch';
                return response;
              });
          } else if (req.type == 'upload') {
            await this.voucherImportModel
              .findByIdAndUpdate(payload.voucher._id, {
                insert_done:
                  payload.voucher.stock == total_insert ? true : false,
                total_insert: total_insert,
              })
              .then((e) => {
                console.log('success update voucher import', e);
              })
              .catch((e) => {
                console.log('failed update voucher import', e);
                response.transaction_classify = 'VOUCHER';
                response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
                response.message = 'failed update voucher import';
                return response;
              });
          }

          response.transaction_classify = 'VOUCHER';
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'voucher insert successfully';
          response.payload = {
            type: req.type,
            batch_no: payload.voucher.batch_no,
            [`voucher_${req.type}_id`]: payload.voucher._id,
            expected_stock: payload.voucher.stock,
            incoming_stock: data_core.length,
            stock_before: payload.voucher.total_insert,
            stock_after: total_insert,
          };
          return response;
        });
    } else {
      console.log('Fail fetch data voucher');
      response.transaction_classify = 'VOUCHER';
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = 'failed fetch data voucher';
      return response;
    }
  }

  async viewVoucherFromCore(payload: any) {
    const authToken = payload.token;
    const limit = payload.limit;
    const skip = payload.skip;
    const filter = encodeURIComponent(JSON.stringify(payload.filter));
    const projection = encodeURIComponent(JSON.stringify(payload.projection));
    const sort = encodeURIComponent(JSON.stringify(payload.sort));
    const addon = encodeURIComponent(JSON.stringify(payload.addon));

    const query = [
      `limit=${limit}`,
      `skip=${skip}`,
      `filter=${filter}`,
      `projection=${projection}`,
      `addon=${addon}`,
      `sort=${sort}`,
      `realm_id=${this.realm}`,
      `branch_id=${this.branch}`,
      `merchant_id=${this.merchant}`,
    ];

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
            return response;
          }),
        ),
    );
  }

  // async saveToCollectionVoucher(payload: any) {
  //   const incoming = payload.payload.voucher.incoming;
  //   let keyword_verification = '';
  //   // tracing_id change TRX to VCR
  //   let tracing_id = payload.tracing_id.split('_');
  //   tracing_id[0] = 'VCR';
  //   tracing_id = tracing_id.join('_');

  //   // Check need verification or not
  //   let need_verification = false;
  //   const verify_id = await this.applicationService.getConfig(
  //     'DEFAULT_ID_VOUCHER_NEED_VERIFICATION', //get id from lov (where set_value : "Keyword Verification")
  //   );
  //   if (verify_id) {
  //     // let check_verify = payload.keyword.notification.filter(e => e.code_identifier.toString() == verify_id);
  //     const check_verify = payload.keyword.notification.filter(
  //       (e) => e.code_identifier == verify_id && e.keyword_name != '',
  //     );
  //     // console.log('get id for need verification voucher : ', verify_id, ', length : ', check_verify.length)
  //     if (check_verify.length > 0) {
  //       need_verification = true;
  //       keyword_verification = check_verify[0].keyword_name;
  //     }
  //     console.log('======= Checking Voucher Verification  =======');
  //     console.log('1. Voucher Verification ID from LOV : ', verify_id);
  //     console.log(
  //       '2. Get verification voucher data in notification field  : ',
  //       check_verify,
  //     );
  //     console.log('3. Result on field need_verification :', need_verification);
  //     console.log('=============================================');
  //   }

  //   const vcr = await this.viewVoucher(payload);
  //   if (vcr['payload']['data']) {
  //     const data = vcr['payload']['data'].map((e) => ({
  //       ...e,
  //       keyword_verification: keyword_verification,
  //       merchant_id: payload.payload.voucher.incoming.merchant_id
  //         ? payload.payload.voucher.incoming.merchant_id
  //         : '',
  //       msisdn: payload.incoming.msisdn ? payload.incoming.msisdn : '',
  //       voucher_type: payload.payload.voucher.incoming.voucher_type,
  //       start_time: e.start_time,
  //       end_time: e.end_time,
  //       id: e.id,
  //       need_verification: need_verification,
  //       tracing_id: tracing_id,
  //       master_id: payload.tracing_master_id,
  //       keyword_id: payload.keyword._id,
  //       keyword_name: payload.keyword.eligibility.name,
  //       batch_no: payload.payload.voucher.core.batch_no,
  //       created_by: payload.account,
  //       responseBody: e,
  //     }));

  //     const newData = this.voucherModel.insertMany(data);
  //     return await newData
  //       .catch((e: BadRequestException) => {
  //         throw new BadRequestException(e.message);
  //       })
  //       .then((e) => {
  //         console.log('SUCCESS SAVE TO COLLECTION');
  //         return;
  //       });
  //   } else {
  //     console.log('Fail fetch data voucher');
  //     return false;
  //   }
  // }

  private convertVoucherStatus(status: string): string {
    switch (status) {
      case 'Available':
        return 'A'; // Active
      case 'Active':
        return 'A'; // Active
      case 'Redeem':
        return 'R'; // Redeem
      case 'Verified':
        return 'V'; // Verified -> V, On core that status is "Use"
      case 'Use':
        return 'V'; // Verified -> V, On core that status is "Use"
      case 'Expire':
        return 'E'; // Expire
      case 'Cancel':
        return 'P'; // Pending
      default:
        return status;
    }
  }

  private unConvertVoucherStatus(status: string): string {
    switch (status) {
      // case 'A':
      //   return 'Available'; // Active
      case 'A':
        return 'Active'; // Active
      case 'R':
        return 'Redeem'; // Redeem
      case 'V':
        return 'Verified'; // Verified -> V, On core that status is "Use"
      case 'E':
        return 'Expire'; // Expire
      case 'P':
        return 'Pending'; // pending
      default:
        return status;
    }
  }

  private convertDate(date: string): Date {
    if (date == null) return null;

    const timezone = 'Asia/Jakarta';
    return moment
      .tz(moment.utc(date), timezone)
      .format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }

  private maskText(text: string, length: number): string {
    return text?.replace(
      new RegExp(`.{${length}}$`),
      [...Array(length).keys()].map(() => 'X').join(''),
    );
  }

  async getFromKeywordId(keywordId: string) {
    const query = [];

    query.push({
      $match: {
        $and: [{ keyword_id: keywordId }, { status: 'Active' }],
      },
    });

    const data = await this.voucherModel.aggregate(query, (err, result) => {
      return result;
    });

    return data;
  }

  // mechanisme voucher upload get data from core
  async getDataTaskById(task_id: string, token: string) {
    const response = new GlobalTransactionResponse();
    const url = `${this.url}/tasks`;
    const config = {
      params: {
        filter: {
          id: task_id,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    };

    console.log(`<--- PREPARE CONFIG :: API TASKS :: ${task_id} --->`);
    console.log('URL : ', url);
    console.log('TOKEN : ', token);
    console.log('CONFIG : ', config);
    console.log(`<--- PREPARE CONFIG :: API TASKS :: ${task_id} --->`);

    return await lastValueFrom(
      this.httpService.get(url, config).pipe(
        map(async (res) => {
          console.log(`<--- SUCCESS :: API TASKS :: ${task_id} --->`);
          console.log({
            code: res?.data?.code,
            message: res?.data?.message,
            ...res?.data?.payload?.tasks?.[0],
          });
          console.log(`<--- SUCCESS :: API TASKS :: ${task_id} --->`);

          const data = res?.data?.payload?.tasks?.[0];
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'TASKS';
          response.payload = {
            data: data,
          };
          return response;
        }),
        catchError(async (e) => {
          const rsp = e?.response;
          response.code = e?.response?.data.code
            ? e?.response?.data.code
            : HttpStatusTransaction.ERR_NOT_FOUND;
          response.message = e?.response?.data.message
            ? e?.response?.data.message
            : 'Fail';
          response.transaction_classify = 'TASKS';
          response.payload = {
            data: null,
            stack: e?.stack,
            error_message: `${rsp.status}|${rsp.statusText}|${
              e?.response?.data.message ? e?.response?.data.message : 'Fail'
            }`,
          };

          console.log(`<--- FAIL :: API TASKS :: ${task_id} --->`);
          console.log('Status Code : ', rsp.status);
          console.log('Status Text : ', rsp.statusText);
          console.log('Data : ', rsp.data);
          console.log(`<--- FAIL :: API TASKS :: ${task_id} --->`);

          return response;
        }),
      ),
    );
  }

  async accumulateVoucher(
    data: VoucherStockSummaryDTO,
    token: string,
  ): Promise<AccumulateVoucherDTO> {
    const keyword_id = data?.keyword_id;
    const type = data?.type ?? 'upload';
    let task_id,
      voucher = null;
    const response = {
      status: false,
      in_progress: false,
      message: 'Failed',
      desc: '-',
      data: null,
    };

    // Query based on keyword_id in collection voucher_import
    if (type == 'upload') {
      voucher = await this.getVoucherImportByKeywordId(keyword_id);
    } else if (type == 'batch') {
      voucher = await this.getVoucherBatchByKeywordId(keyword_id);
    }

    if (voucher) {
      if (!voucher.insert_done) {
        task_id = voucher?.responseBody?.payload?.id;
        const data_task = await this.getDataTaskById(task_id, token);
        if (data_task.code == HttpStatusTransaction.CODE_SUCCESS) {
          const task = data_task?.payload?.data;
          const task_result = this.convertTaskDescToJson(task.desc);
          const checkStock = await this.checkStockVoucherImportOrBatch(
            voucher,
            task_result,
            task.status,
            type,
          );

          if (task.status == 'Complete') {
            const updateVoucherImport =
              await this.updateStockVoucherImportOrBatch(
                voucher._id,
                checkStock,
                type,
              );
            if (
              updateVoucherImport.code == HttpStatusTransaction.CODE_SUCCESS
            ) {
              if (checkStock.status) {
                response.status = true;
                response.message = 'Success';
                response.desc = 'Voucher Accumulate is Success';
                response.data = {
                  total_record: task_result.total_record,
                  total_success: task_result.total_success,
                  total_fail: 0,
                  expected_stock: checkStock.stock,
                  accumulated_stock: checkStock.accumulated_stock,
                  remaining_stock: checkStock.remaining_stock,
                };
              } else {
                response.desc =
                  checkStock.desc ?? 'Voucher Accumulate is Failed';
                response.data = {
                  total_record: task_result.total_record,
                  total_success: task_result.total_success,
                  total_fail: task_result.total_fail,
                  expected_stock: checkStock.stock,
                  accumulated_stock: checkStock.accumulated_stock,
                  remaining_stock: checkStock.remaining_stock,
                };
              }
            } else {
              // Failed update to collection
              response.desc = 'Failed update to collection';
              response.data = updateVoucherImport;
            }
          } else if (task.status == 'Processing' || task.status == 'Waiting') {
            if (
              task_result.total_record == task_result.total_fail &&
              task_result.total_record != 0 &&
              task_result.total_fail != 0
            ) {
              response.desc =
                checkStock.desc ?? 'Voucher Accumulate is Failed.';
              response.data = {
                total_record: task_result.total_record ?? 0,
                total_success: 0,
                total_fail: task_result.total_fail,
                expected_stock: checkStock.stock,
                accumulated_stock: checkStock.accumulated_stock,
                remaining_stock: checkStock.remaining_stock,
              };
            } else {
              response.in_progress = true;
              response.message = task.status;
              response.desc =
                task.status == 'Processing'
                  ? 'Voucher Accumulate is processing'
                  : task.status == 'Waiting'
                  ? 'Voucher Accumulate is waiting'
                  : '-';
              response.data = {
                total_record: task_result.total_record,
                total_success: task_result.total_success,
                total_fail: task_result.total_fail,
                expected_stock: checkStock.stock,
                accumulated_stock: checkStock.accumulated_stock,
                remaining_stock: checkStock.remaining_stock,
              };
            }
          } else if (task.status == 'Fail') {
            response.desc = task?.remark;
            response.data = {
              total_success: 0,
              total_fail: task_result?.total_record ?? 0,
              expected_stock: checkStock.stock,
              accumulated_stock: checkStock.accumulated_stock,
              remaining_stock: checkStock.remaining_stock,
            };
          } else {
            response.desc = 'UNDEFINED';
            response.data = task;
          }
        } else {
          response.desc = 'Failed get data tasks from core';
          response.data = data_task;
        }
      } else {
        const is_fulfullment =
          voucher.total_insert >= voucher.stock ? true : false;
        const status_fulfillment = is_fulfullment ? 'Success' : 'Failed';
        // if insert_done is true
        response.status = is_fulfullment;
        response.message = status_fulfillment;
        response.desc = 'Get voucher stock from collection';
        response.data = {
          total_success: voucher.total_insert,
          total_fail: voucher?.total_fail ?? 0,
          expected_stock: voucher.stock,
          accumulated_stock: voucher.total_insert,
          remaining_stock: voucher.total_insert,
        };
      }
    } else {
      response.desc = 'Voucher data not found';
    }

    return response;
  }

  async updateStockVoucherImportOrBatch(
    id: string,
    data: CheckStockVoucherImportOrBatchDTO,
    type: string,
  ) {
    const response = new GlobalTransactionResponse();
    const status =
      data.status_task == 'Complete' ||
      data.status_task == 'Failed' ||
      data.status_task == 'Fail'
        ? true
        : false;
    if (type == 'batch') {
      return await this.voucherBatchModel
        .findByIdAndUpdate(id, {
          insert_done: status,
          total_insert: data.accumulated_stock,
          total_fail: data.total_fail,
        })
        .then((e) => {
          console.log(
            `<--- SUCCESS :: updateVoucherImportOrBatch :: BATCH --->`,
          );
          console.log(data);
          console.log(
            `<--- SUCCESS :: updateVoucherImportOrBatch :: BATCH --->`,
          );

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'VOUCHER_IMPORT';
          response.payload = {
            data: data,
          };
          return response;
        })
        .catch((e) => {
          console.log(`<--- FAIL :: updateVoucherImportOrBatch :: BATCH --->`);
          console.log(e);
          console.log(`<--- FAIL :: updateVoucherImportOrBatch :: BATCH --->`);

          const rsp = e?.response;
          response.code = e?.response?.data.code
            ? e?.response?.data.code
            : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
          response.message = e?.response?.data.message
            ? e?.response?.data.message
            : 'Fail';
          response.transaction_classify = 'VOUCHER_IMPORT';
          response.payload = {
            data: null,
            stack: e?.stack,
            error_message: `${rsp.status}|${rsp.statusText}|${
              e?.response?.data.message ? e?.response?.data.message : 'Fail'
            }`,
          };
          return response;
        });
    } else if (type == 'upload') {
      return await this.voucherImportModel
        .findByIdAndUpdate(id, {
          insert_done: status,
          total_insert: data.accumulated_stock,
          total_fail: data.total_fail,
        })
        .then((e) => {
          console.log(
            `<--- SUCCESS :: updateVoucherImportOrBatch :: UPLOAD --->`,
          );
          console.log(data);
          console.log(
            `<--- SUCCESS :: updateVoucherImportOrBatch :: UPLOAD --->`,
          );

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'VOUCHER_IMPORT';
          response.payload = {
            data: data,
          };
          return response;
        })
        .catch((e) => {
          console.log(`<--- FAIL :: updateVoucherImportOrBatch :: UPLOAD --->`);
          console.log(e);
          console.log(`<--- FAIL :: updateVoucherImportOrBatch :: UPLOAD --->`);

          const rsp = e?.response;
          response.code = e?.response?.data.code
            ? e?.response?.data.code
            : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
          response.message = e?.response?.data.message
            ? e?.response?.data.message
            : 'Fail';
          response.transaction_classify = 'VOUCHER_IMPORT';
          response.payload = {
            data: null,
            stack: e?.stack,
            error_message: `${rsp.status}|${rsp.statusText}|${
              e?.response?.data.message ? e?.response?.data.message : 'Fail'
            }`,
          };
          return response;
        });
    }

    response.code = HttpStatusTransaction.ERR_NOT_FOUND;
    response.message = 'Not Found';
    response.transaction_classify = 'VOUCHER_IMPORT';
    response.payload = {
      trace_id: null,
    };
    return response;
  }

  async checkStockVoucherImportOrBatch(
    voucher: any,
    tasks: VoucherTaskResultDTO,
    status: string,
    voucher_type: string,
  ): Promise<CheckStockVoucherImportOrBatchDTO> {
    let stock,
      accumulated_stock = 0;
    let desc = null;
    const task_id = voucher?.responseBody?.payload?.id;
    stock = voucher.stock;

    // check to collection voucher task based on task_id
    const accumulate_stock = await this.accumulateTotalStockVoucherTask(
      voucher.keyword_id,
      voucher_type,
    );
    if (accumulate_stock.length > 0) {
      const total_accumulate_stock = accumulate_stock[0].total_accumulate_stock;
      const voucher_task_id = await this.findVoucherTaskId(
        task_id,
        voucher_type,
      );
      if (voucher_task_id) {
        desc = `Voucher Accumulate is Failed. Voucher task id already exist, process calculate existing data.`;
        accumulated_stock = total_accumulate_stock;
      } else {
        accumulated_stock =
          total_accumulate_stock == stock
            ? total_accumulate_stock
            : total_accumulate_stock + tasks.total_success;
      }
    } else {
      accumulated_stock = tasks.total_success;
    }

    // upsert voucher task
    await this.upsertVoucherTask(
      {
        keyword_id: voucher.keyword_id,
        task_id: voucher.responseBody.payload.id,
        type: voucher_type,
      },
      {
        keyword_id: voucher.keyword_id,
        task_id: voucher.responseBody.payload.id,
        total_record: tasks.total_record,
        total_success: tasks.total_success,
        total_fail: tasks.total_fail,
        accumulate_stock: accumulated_stock,
        status: status,
      },
    );

    if (accumulated_stock >= stock) {
      return {
        status: true,
        stock: stock,
        accumulated_stock: accumulated_stock,
        remaining_stock: voucher.total_insert,
        total_fail: 0,
        status_task: status,
        desc: desc,
      };
    } else {
      desc = 'Voucher Accumulate is Failed. Stock is less than expectation';
    }

    return {
      status: false,
      stock: stock,
      accumulated_stock: accumulated_stock,
      remaining_stock: voucher.total_insert,
      total_fail: tasks.total_fail,
      status_task: status,
      desc: desc,
    };
  }

  convertTaskDescToJson(string: string): VoucherTaskResultDTO {
    const result = {
      total_record: 0,
      total_success: 0,
      total_fail: 0,
    };

    if (string) {
      console.log('<-- BEFORE ::  convertTaskDescToJson -->');
      const cleanedString = string
        .split('\n')
        .map((line) => line.trim())
        .join('|');

      const arr = cleanedString
        .split('|')
        .filter((item) => item !== null && item != '');
      let no = 1;
      for (const item of arr) {
        console.log(`${no++}. ${item}`);
        const parts = item.split(':');
        const key = parts[0].trim().toLowerCase().replace(' ', '_');
        const value = parseInt(parts[1].replace(/,/g, '').trim());
        result[key] = value;
      }
      console.log('<-- BEFORE ::  convertTaskDescToJson -->');

      console.log('<-- AFTER ::  convertTaskDescToJson -->');
      console.log(result);
      console.log('<-- AFTER ::  convertTaskDescToJson -->');
    }

    return result;
  }

  async getVoucherImportByKeywordId(keyword_id: string) {
    let data = null;
    try {
      data = await this.voucherImportModel.findOne({
        keyword_id: keyword_id,
      });
    } catch (error) {
      console.log('<-- Fail :: getVoucherImportByKeywordId -->');
      console.log(error);
      console.log('<-- Fail :: getVoucherImportByKeywordId -->');
    }
    return data;
  }

  async getVoucherImportByBatchNo(batch_no: string) {
    let data = null;
    try {
      data = await this.voucherImportModel.findOne({
        batch_no: batch_no,
      });
    } catch (error) {
      console.log('<-- Fail :: getVoucherImportByBatchNo -->');
      console.log(error);
      console.log('<-- Fail :: getVoucherImportByBatchNo -->');
    }
    return data;
  }

  async getVoucherBatchByKeywordId(keyword_id: string) {
    let data = null;
    try {
      data = await this.voucherBatchModel.findOne({
        keyword_id: keyword_id,
      });
    } catch (error) {
      console.log('<-- Fail :: getVoucherBatchByKeywordId -->');
      console.log(error);
      console.log('<-- Fail :: getVoucherBatchByKeywordId -->');
    }
    return data;
  }

  async upsertVoucherTask(find: any, update: any) {
    let data = null;
    try {
      data = await this.voucherTaskModel.findOneAndUpdate(find, update, {
        upsert: true,
      });
    } catch (error) {
      console.log('<-- Fail :: upsertVoucherTask -->');
      console.log(error);
      console.log('<-- Fail :: upsertVoucherTask -->');
    }
    return data;
  }

  async findVoucherTaskId(task_id: string, voucher_type: string) {
    let data = null;
    try {
      data = await this.voucherTaskModel.findOne({
        task_id: task_id,
        type: voucher_type,
      });
    } catch (error) {
      console.log('<-- Fail :: findVoucherTaskId -->');
      console.log(error);
      console.log('<-- Fail :: findVoucherTaskId -->');
    }
    return data;
  }

  async accumulateTotalStockVoucherTask(
    keyword_id: string,
    voucher_type: string,
  ) {
    let data = null;
    try {
      const aggregationPipeline = [
        {
          $match: { keyword_id: keyword_id, type: voucher_type },
        },
        {
          $group: {
            _id: null,
            total_accumulate_stock: { $sum: '$total_success' },
          },
        },
      ];

      data = await this.voucherTaskModel.aggregate(aggregationPipeline);
    } catch (error) {
      console.log('<-- Fail :: accumulateTotalStockVoucherTask -->');
      console.log(error);
      console.log('<-- Fail :: accumulateTotalStockVoucherTask -->');
    }

    return data;
  }

  /**
   * Update voucher status based on the provided payload.
   * @param payload - The payload containing information for updating the voucher status.
   * @returns Promise<any> - A Promise containing the response data from the update operation.
   */
  async updateVoucherStatus(payload: VoucherPatchPayload): Promise<any> {
    const url = `${this.url}/vouchers/status`;

    // Check if the status in the payload is empty
    if (!payload.status) {
      throw new Error('Payload status cannot be empty');
    }

    // Set default values if none are provided
    payload.locale = payload.locale || 'id-ID';
    payload.merchant_id = payload?.merchant_id || this.merchant;
    payload.realm_id = payload?.realm_id || this.realm;
    payload.branch_id = payload?.branch_id || this.branch;

    try {
      const response = await this.httpService
        .patch(url, payload, {
          headers: {
            accept: '*/*',
            Authorization: `${payload.authorizationToken}`,
            'Content-Type': 'application/json',
          },
        })
        .toPromise();

      return response.data; // Adjust based on the actual response structure
    } catch (error) {
      console.log('ERROR_VOUCHER -> ', JSON.stringify(error?.message));
      console.log(error);
      console.log('ERROR_VOUCHER_FULL -> ', JSON.stringify(error));
      // Handle errors here
      throw new Error('Failed to update voucher status');
    }
  }

  /**
   * Update pending vouchers based on the provided batch number and authorization token.
   * @param batch_no - The batch number for updating pending vouchers.
   * @param token - The authorization token for authentication.
   * @param account - The representing the user account initiating the action.
   * @returns Promise<any> - A Promise containing the response data from the update operation.
   */
  async updatePendingVouchersBasedOnBatchNo(
    batch_no: string,
    token: string,
    account: Account,
  ): Promise<any> {
    const response = new GlobalTransactionResponse();
    const batch_no_split = batch_no.split('_');
    const keyword_name = batch_no_split[0];
    const keyword_id = batch_no_split[1];

    // Check batch_no is exist ot not
    const checkBatchNoInVoucherImport = await this.getVoucherImportByBatchNo(
      batch_no,
    );
    if (!checkBatchNoInVoucherImport) {
      // Failed
      response.code = HttpStatusTransaction.ERR_NOT_FOUND;
      response.message = `Failed update vouchers to pending status, batch_no is not found.`;
      response.transaction_classify = 'VOUCHER_UPDATE_STATUS';
      response.payload = {
        task_id: null,
      };

      return response;
    }

    try {
      const data = await this.updateVoucherStatus({
        authorizationToken: token,
        criteria: {
          status: 'Active',
          batch_no: batch_no,
        },
        use_cron_job: true,
        status: 'Cancel',
      });

      if (data?.code == HttpStatusTransaction.CODE_SUCCESS) {
        if (data?.payload?.total) {
          // Set variable
          const total = data?.payload?.total;

          if (total > 0) {
            // Create log data and save it to the database
            const logData = {
              keyword_id: keyword_id,
              keyword_name: keyword_name,
              batch_no: batch_no,
              status: 'Cancel',
              response_core: data,
              total_affected: data?.payload?.total || 0,
              created_by: account,
            };

            await this.voucherUpdateService.createVoucherUpdateLog(logData);
          }

          // Successful update
          response.code =
            total > 0
              ? HttpStatusTransaction.CODE_SUCCESS
              : HttpStatusTransaction.ERR_NOT_FOUND;
          response.message =
            total > 0
              ? 'Success'
              : 'Failed update vouchers to pending status, vouchers is not found in core';
          response.transaction_classify = 'VOUCHER_UPDATE_STATUS';
          response.payload = {
            total: data?.payload?.total || 0,
          };

          return response;
        }

        if (data?.payload?.id) {
          const task_id = data?.payload?.id;

          // Create log data and save it to the database
          const logData = {
            keyword_id: keyword_id,
            keyword_name: keyword_name,
            batch_no: batch_no,
            status: 'Cancel',
            response_core: data,
            task_id: task_id,
            created_by: account,
          };

          await this.voucherUpdateService.createVoucherUpdateLog(logData);

          // Successful update
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message =
            "Processing update status pending voucher. The result will be sent via this user's email, please check the email regularly";
          response.transaction_classify = 'VOUCHER_UPDATE_STATUS';
          response.payload = {
            id: task_id,
          };

          return response;
        }
      } else {
        // Failed update
        response.code = HttpStatusTransaction.ERR_NOT_FOUND;
        response.message = data?.message || 'Failed update vouchers to core';
        response.transaction_classify = 'VOUCHER_UPDATE_STATUS';
        response.payload = {
          total: null,
          data: data,
        };

        return response;
      }
    } catch (error) {
      // Handle errors here
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message =
        error?.message || 'Failed general update vouchers to core';
      response.transaction_classify = 'VOUCHER_UPDATE_STATUS';
      response.payload = {
        total: null,
      };

      return response;
    }
  }

  /**
   * Service endpoint to view vouchers or download vouchers from core.
   * @param payload - The payload containing token and voucher details.
   * @returns Promise<GlobalTransactionResponse> - A Promise containing the response data from the service operation.
   */
  async viewVoucherCore(
    payload: ViewVoucherCoreFilter,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    let query = [];
    const skip = payload.skip;
    const limit = payload.limit;
    const token = payload.token;
    const action = payload?.action;
    const filter = encodeURIComponent(JSON.stringify(payload.filter || {}));
    const projection = encodeURIComponent(
      JSON.stringify(payload.projection || {}),
    );
    const sort = encodeURIComponent(JSON.stringify(payload.sort || {}));
    const addon = encodeURIComponent(JSON.stringify(payload.addon || {}));

    if (action == 'export') {
      const export_field = encodeURIComponent(
        JSON.stringify(payload.export_field || {}),
      );
      query = [
        `filter=${filter}`,
        `projection=${projection}`,
        `export_field=${export_field}`,
        `action=${action}`,
        `realm_id=${this.realm}`,
        `branch_id=${this.branch}`,
        `merchant_id=${this.merchant}`,
      ];
    } else {
      query = [
        `limit=${limit}`,
        `skip=${skip}`,
        `filter=${filter}`,
        `projection=${projection}`,
        `addon=${addon}`,
        `sort=${sort}`,
        `realm_id=${this.realm}`,
        `branch_id=${this.branch}`,
        `merchant_id=${this.merchant}`,
      ];
    }

    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/vouchers?${query.join('&')}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            let result = null;
            const data = res.data;

            if (data?.code == HttpCodeTransaction.CODE_SUCCESS_200) {
              result = data.payload;
            }

            response.code = data.code;
            response.message = data.message;
            response.transaction_classify = 'VOUCHER CORE';
            response.payload = {
              data: result || data,
            };

            return response;
          }),
          catchError(async (e) => {
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER CORE';
            response.payload = {
              data: null,
            };

            return response;
          }),
        ),
    );
  }

  /**
   * Initiates the download process for pending vouchers based on the provided batch number.
   * Sends a notification email to the user about the download pending voucher.
   * @param batch_no - The batch number for initiating the download process.
   * @param token - The authorization token for authentication.
   * @returns Promise<any> - A Promise containing the response data from the download initiation.
   */
  async downloadPendingVouchersBasedOnBatchNo(
    batch_no: string,
    token: string,
    account: Account,
  ): Promise<any> {
    const response = new GlobalTransactionResponse();
    try {
      // Check batch_no is exist ot not
      const checkBatchNoInVoucherImport = await this.getVoucherImportByBatchNo(
        batch_no,
      );
      if (!checkBatchNoInVoucherImport) {
        // Failed
        response.code = HttpStatusTransaction.ERR_NOT_FOUND;
        response.message = `Failed to download pending voucher, batch_no is not found.`;
        response.transaction_classify = 'VOUCHER_DOWNLOAD';
        response.payload = {
          task_id: null,
        };

        return response;
      }

      const payload: ViewVoucherCoreFilter = {
        token: token,
        action: 'export',
        filter: {
          status: 'Cancel',
          batch_no: batch_no,
        },
        projection: {
          voucher_code: 1,
        },
        export_field: {
          batch_no: 'Batch No',
          voucher_code: 'Voucher Code',
        },
      };

      const data = await this.viewVoucherCore(payload);
      console.log(data);

      if (data?.code == HttpStatusTransaction.CODE_SUCCESS) {
        const result = data.payload?.data?.id;

        // Successful
        response.code = data?.code;
        response.message =
          "Processing to download pending voucher. The result will be sent via this user's email, please check the email regularly";
        response.transaction_classify = 'VOUCHER_DOWNLOAD';
        response.payload = {
          task_id: result || null,
        };

        return response;
      } else {
        // Failed
        response.code = HttpStatusTransaction.ERR_NOT_FOUND;
        response.message = data?.message || 'Failed download pending vouchers';
        response.transaction_classify = 'VOUCHER_DOWNLOAD';
        response.payload = {
          task_id: null,
          data: data,
        };

        return response;
      }
    } catch (error) {
      // Handle errors
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message =
        error?.message || 'Failed general download pending vouchers';
      response.transaction_classify = 'VOUCHER_DOWNLOAD';
      response.payload = {
        task_id: null,
      };

      return response;
    }
  }

  async voucherUploadSummary(param) {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    query.push({
      $match: {
        $and: [
          {
            deleted_at: null,
          },
        ],
      },
    });

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          if (a === 'created_at') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn, { deleted_at: null });
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    const allNoPagination = await this.voucherTaskModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    query.push({
      $addFields: {
        upload_date: '$created_at',
        process_date: '$updated_at',
      },
    });

    query.push({
      $project: {
        responseBody: false,
      },
    });

    console.log('| Voucher Upload Summary Query: ', JSON.stringify(query));

    let data = await this.voucherTaskModel.aggregate(query, (err, result) => {
      return result;
    });

    // cek status setiap task upload
    await Promise.all(
      data.map(async (vch) => {
        if (vch.status != 'Complete') {
          await this.voucherUploadSummaryCheckByTaskId(vch, param.token);
        }
      }),
    );

    // reload data
    data = null;
    data = await this.voucherTaskModel.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoPagination.length,
        data: data,
      },
    };
  }

  async voucherUploadSummaryCron() {
    const query = [];

    let token = await this.applicationService.getSystemToken();
    token = `Bearer ${token}`;

    query.push({
      $match: {
        $and: [
          {
            deleted_at: null,
          },
        ],
      },
    });

    query.push({
      $project: {
        responseBody: false,
      },
    });

    const data = await this.voucherTaskModel.aggregate(query, (err, result) => {
      return result;
    });

    // cek status setiap task upload
    await Promise.all(
      data.map(async (vch) => {
        if (vch.status != 'Complete') {
          await this.voucherUploadSummaryCheckByTaskId(vch, token);
        }
      }),
    );
  }

  async voucherUploadSummaryCheckByTaskId(vch, token) {
    try {
      const task_id = vch?.task_id;

      if (!task_id) {
        console.error('Task id is empty!');
        return false;
      }

      const taskFromCore = await this.getDataTaskById(task_id, token);

      if (taskFromCore.code == HttpStatusTransaction.CODE_SUCCESS) {
        const task = taskFromCore?.payload?.data;

        if (task) {
          const task_result = this.convertTaskDescToJson(task.desc);
          const task_status = task.status;
          // task_result.total_record == task_result.total_success
          //   ? 'Complete'
          //   : 'Fail';

          // update valuenya
          await this.voucherTaskModel.updateOne(
            {
              task_id: task_id,
            },
            {
              total_record: task_result.total_record,
              total_success: task_result.total_success,
              total_fail: task_result.total_fail,
              status: task_status,
              responseBody: taskFromCore,
            },
          );
        }
      }
    } catch (error) {
      console.error('voucherUploadSummaryCheckByTaskId error: ', error);
    }

    // update stoknya jika data sudah sampe akhir
    // if (totalData == currentIndex + 1) {
    //   await this.voucherUploadSummaryStockUpdate(vch, token);
    // }
  }

  // async voucherUploadSummaryStockUpdate(vch, token) {
  //   // get total voucher data
  //   const totalVoucherSummary = await this.totalVoucherSummaryFromCore(
  //     vch?.batch_no,
  //     token,
  //   );

  //   // update stock
  //   const stock = await this.stockService.getStock({
  //     location: '',
  //     product: this.voucher_product,
  //     keyword: vch.keyword_id.toString(),
  //   });

  //   // await this.stockService.update_stock_for_voucher_summary()
  //   console.log(totalVoucherSummary);
  // }

  private async checkIsValidObjectId(str) {
    try {
      const check = new ObjectId(str);
      if (check?.toString() == str) {
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  async totalVoucherSummaryFromCore(keyword_id, token) {
    const response = new GlobalTransactionResponse();

    const validObjectId = await this.checkIsValidObjectId(keyword_id);
    if (!validObjectId) {
      response.code = HttpStatusTransaction.ERR_NOT_FOUND;
      response.message = 'Keyword_id is invalid format!';
      response.transaction_classify = 'VOUCHER_SUMMARY';
      response.payload = {};

      return response;
    }

    const keyword = await this.keywordModel.findById(keyword_id);
    if (!keyword) {
      response.code = HttpStatusTransaction.ERR_NOT_FOUND;
      response.message = 'Keyword not found!';
      response.transaction_classify = 'VOUCHER_SUMMARY';
      response.payload = {};

      return response;
    }

    const batch_no = `${keyword.eligibility.name}_${keyword._id.toString()}`;

    // check to local db first
    // fixing from core, 2024-02-29

    // const taskCount = await this.voucherTaskModel.count({
    //   keyword_id: new ObjectId(keyword_id),
    // });
    // if (taskCount == 0) {
    //   console.log(`<--- SKIPP :: API VOUCHER SUMMARY :: ${batch_no} --->`);

    //   response.code = HttpStatusTransaction.ERR_NOT_FOUND;
    //   response.message = "This keyword doesn't have any voucher uploaded";
    //   response.transaction_classify = 'VOUCHER_SUMMARY';
    //   response.payload = {};

    //   return response;
    // }

    const url = `${this.url}/vouchers/summary`;

    const config = {
      params: {
        locale: 'id-ID',
        filter: {
          batch_no: batch_no,
        },
        projection: {},
        addon: {},
        realm_id: this.realm,
        branch_id: this.branch,
        mechant_id: this.merchant,
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    };

    console.log(`<--- PREPARE :: API VOUCHER SUMMARY :: ${batch_no} --->`);
    console.log('URL : ', url);
    console.log('TOKEN : ', token);
    console.log('CONFIG : ', JSON.stringify(config));
    console.log(`<--- PREPARE :: API VOUCHER SUMMARY :: ${batch_no} --->`);

    return await lastValueFrom(
      this.httpService.get(url, config).pipe(
        map(async (res) => {
          console.log(
            `<--- SUCCESS :: API VOUCHER SUMMARY :: ${batch_no} --->`,
          );

          const data = await this.totalVoucherSummaryFromCoreFormatResponse(
            res?.data?.payload,
          );

          console.log({
            code: res?.data?.code,
            message: res?.data?.message,
            data: data,
          });

          const listPendingFile = await this.listPendingVoucherUploadFile(
            batch_no,
            token,
          );

          console.log(
            `<--- SUCCESS :: API VOUCHER SUMMARY :: ${batch_no} --->`,
          );

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'VOUCHER_SUMMARY';
          response.payload = {
            batch_number: batch_no,
            data: data,
            ...listPendingFile,
          };
          return response;
        }),
        catchError(async (e) => {
          const rsp = e?.response;
          response.code = e?.response?.data.code
            ? e?.response?.data.code
            : HttpStatusTransaction.ERR_NOT_FOUND;
          response.message = e?.response?.data.message
            ? e?.response?.data.message
            : 'Fail';
          response.transaction_classify = 'VOUCHER_SUMMARY';
          response.payload = {
            data: null,
            stack: e?.stack,
            error_message: `${rsp.status}|${rsp.statusText}|${
              e?.response?.data.message ? e?.response?.data.message : 'Fail'
            }`,
          };

          console.log(`<--- FAIL :: API VOUCHER SUMMARY :: ${batch_no} --->`);
          console.log('Status Code : ', rsp.status);
          console.log('Status Text : ', rsp.statusText);
          console.log('Data : ', JSON.stringify(rsp.data));
          console.log(`<--- FAIL :: API VOUCHER SUMMARY :: ${batch_no} --->`);

          return response;
        }),
      ),
    );
  }

  private async totalVoucherSummaryFromCoreFormatResponse(response) {
    const ret = {
      active: response?.Active ?? 0, // available
      // inactive: response?.Inctive ?? 0,
      pending: response?.Cancel ?? 0, // pending
      expired: response?.Expire ?? 0, // expired
      redeem: response?.Redeem ?? 0, // redeemed
      verified: response?.Use ?? 0, // redeemed & verified
      // use: response?.Use ?? 0,
    };

    return {
      total: ret.active + ret.pending + ret.expired + ret.redeem + ret.verified,
      ...ret,
    };
  }

  private async listPendingVoucherUploadFile(batch_no, token) {
    const query = [];

    query.push({
      $match: {
        $and: [
          {
            batch_no: batch_no,
            status: {
              $in: ['Waiting', 'Processing'],
            },
          },
        ],
      },
    });

    let dataFull = await this.voucherTaskModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    // cek status setiap task upload
    await Promise.all(
      dataFull.map(async (vch) => {
        await this.voucherUploadSummaryCheckByTaskId(vch, token);
      }),
    );

    dataFull = null;

    query.push({
      $project: {
        _id: false,
        __v: false,
        keyword_id: false,
        task_id: false,
        batch_no: false,
        accumulate_stock: false,
        total_record: false,
        total_success: false,
        total_fail: false,
        type: false,
        responseBody: false,
        created_by: false,
        created_at: false,
        updated_at: false,
      },
    });

    const dataRes = await this.voucherTaskModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    return {
      status: dataRes?.length > 0 ? 'Waiting' : 'Complete',
      waiting_files: dataRes,
    };
  }

  /**
   * Service endpoint to view vouchers from core with prime template.
   * @param req - the request template for voucher core prime.
   * @returns Promise<any> - A Promise containing the response data from the download initiation.
   */
  async getVoucherCorePrime(req: VoucherCorePrimeTemplate): Promise<any> {
    const response: VoucherCorePrimeResponse = {
      message: 404,
      description: 'Not Found',
      code: HttpStatusTransaction.ERR_NOT_FOUND,
      payload: {
        totalRecords: 0,
        data: [],
      },
    };

    // Set Variable
    const need_verification = false;

    // check batch_no to collection voucher_import
    const new_filter: any = req.filters;
    const voucher_import = await this.getVoucherImportByBatchNo(
      new_filter?.batch_no,
    );

    if (voucher_import) {
      //// Take out case need discussion - 2024-02-28
      //// Checking keyword verification or not
      // need_verification = await this.checkingKeywordVoucherVerification(
      //   voucher_import.keyword_id,
      // );
    } else {
      response.description = 'batch_no not found, please check your batch_no';
      return response;
    }

    try {
      const payload: ViewVoucherCoreFilter = {
        token: req.token,
        filter: req.filters || {},
        skip: req.first || 0,
        limit: req.rows || 10,
        projection: {
          voucher_code: 1,
        },
      };

      if (req.sortField) {
        payload.sort = { ...payload.sort, [req['sortField']]: req.sortOrder };
      }

      const resultCore = await this.viewVoucherCore(payload);
      if (resultCore.code == HttpCodeTransaction.CODE_SUCCESS_200) {
        const total =
          resultCore.payload.data['vouchers'][0]['total'][0]['count'];
        const result = resultCore.payload.data['vouchers'][0]['result'];

        response.code = resultCore.code;
        response.message = 200;
        response.description = resultCore.message;
        response.payload.totalRecords = total;

        if (total > 0) {
          response.payload.data = result.map((e) => ({
            ...e,
            status_custom: this.converVoucherStatusNewMechanism(
              e.status,
              need_verification,
            ),
            updated_at: this.converUpdateTimeVoucherToWib(
              e?.update_time || e?.create_time,
            ),
          }));
        } else {
          response.message = 404;
          response.description = 'Not Found';
          response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
        }
      }

      return response;
    } catch (error) {
      response.description = error?.message;
      return response;
    }
  }

  async checkingKeywordVoucherVerification(keyword_id: any): Promise<boolean> {
    let need_verification = false;
    const verify_id = await this.applicationService.getConfig(
      'DEFAULT_ID_VOUCHER_NEED_VERIFICATION',
    );

    // convert _id string to objectId
    const keyword = await this.keywordModel.findOne({
      _id: new ObjectID(keyword_id),
    });
    if (verify_id) {
      const check_verify = keyword.notification.filter(
        (e) => e.code_identifier == verify_id && e.keyword_name != '',
      );

      if (check_verify.length > 0) {
        need_verification = true;
      }

      console.log('======= Checking Voucher Verification  =======');
      console.log('1. Keyword ID : ', keyword_id);
      console.log('2. Voucher Verification ID from LOV : ', verify_id);
      console.log(
        '3. Get verification voucher data in notification field  : ',
        check_verify,
      );
      console.log('4. Result on field need_verification :', need_verification);
      console.log('=============================================');
    }

    return need_verification;
  }

  private converVoucherStatusNewMechanism(
    status,
    need_verification = false,
  ): string {
    // Take out case need discussion - 2024-02-28
    // if (status == 'Redeem' && need_verification) {
    //   return 'O'; //on process to be verified
    // } else {
    //   return this.convertVoucherStatus(status);
    // }

    return this.convertVoucherStatus(status);
  }

  private converUpdateTimeVoucherToWib(time: string = null) {
    if (time) {
      return this.convertUTCtoGMT7(time);
    }

    return '-';
  }

  private convertUTCtoGMT7(utcDate: string) {
    // Parse input UTC date string
    const utcDateTime = new Date(utcDate);

    // Set the timezone offset for GMT+7
    const gmt7Offset = 7 * 60; // 7 hours in minutes
    const gmt7DateTime = new Date(utcDateTime.getTime() + gmt7Offset * 60000);

    // Format the result in ISO 8601 format
    const formattedGMT7Date = gmt7DateTime.toISOString();

    return formattedGMT7Date;
  }

  async checkVoucherTransactionDetail(req) {
    const response = new GlobalTransactionResponse();

    try {
      const data = await this.voucherModel.findOne({
        batch_no: req?.batch_no,
        'responseBody.voucher_code': req.voucher_code,
      });

      if (!data) {
        response.code = HttpStatusTransaction.ERR_NOT_FOUND;
        response.message = 'Voucher with given criteria not found!';
        response.transaction_classify = 'VOUCHER_TRANSACTION_DETAIL_SUMMARY';
        response.payload = {};

        return response;
      }

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      response.transaction_classify = 'VOUCHER_TRANSACTION_DETAIL_SUMMARY';
      response.payload = {
        data: {
          redeemed_date: this.convertDate(
            (data?.responseBody as any)?.time.toString(),
          ),
          verified_date: this.convertDate(data?.verified_date?.toString()),
        },
      };

      return response;
    } catch (err) {
      throw new BadRequestException(err?.message);
    }
  }

  /**
   * Removes special characters from a string, leaving only letters, numbers, and underscores.
   *
   * @param {string} str - Input string that may contain special characters.
   * @returns {string} The string cleaned of special characters.
   *
   * @example
   * // Removes Unicode characters and special symbols
   * removeSpecialCharacter('\ufffaNEWVCRUPYY1') // Returns: 'NEWVCRUPYY1'
   * removeSpecialCharacter('Hello@World!123') // Returns: 'HelloWorld123'
   */
  removeSpecialCharacter(str) {
    return str.replace(/[^\w]/g, '');
  }

  /**
   * 1. Bulk update voucher to soft delete for cleansing if status = A
   * db.transaction_voucher.updateMany({ status: "Active" }, { $set: { deleted_at: new Date(), remark: "Cleansing non Redeemed status in transaction_voucher" }});
   */
  async bulkUpdateVoucherActiveToSoftDelete() {
    let start = Date.now();
    let total_success = 0;
    let total_fail = 0;

    console.log(
      `[BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE] Attempting to soft delete all voucher with status 'Active'`,
    );

    try {
      // get all active vouchers
      const selectedVouchers = await this.voucherModel.aggregate(
        [
          {
            $match: {
              status: 'Active',
              deleted_at: null,
            },
          },
          {
            $project: {
              _id: 1,
              'responseBody.voucher_code': 1,
            },
          },
        ],
        (res, error) => {
          return res;
        },
      );

      console.log(
        `[BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE] ${selectedVouchers?.length} marked as 'Soft Delete'`,
      );

      // === START NON-CORE UPDATE ===
      const selectedVouchersIds = selectedVouchers.map((el) =>
        el._id?.toString(),
      );

      const updateManyResult = await this.voucherModel.updateMany(
        {
          _id: {
            $in: selectedVouchersIds,
          },
        },
        {
          $set: {
            deleted_at: new Date(),
            remark: 'Cleansing non Redeemed status in Transaction Voucher',
          },
        },
      );

      console.log(
        `[BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE] Success soft deleting ${
          updateManyResult?.modifiedCount
        } vouchers [NON-CORE]. ${this.getTime(start)}`,
      );

      total_success = updateManyResult?.modifiedCount;

      // === END NON-CORE UPDATE ===

      // === START CORE UPDATE ===
      // start = Date.now();

      // for (let i = 0; i < selectedVouchers?.length; i++) {
      //   const oneVoucher = selectedVouchers[i];

      //   // TODO update to core
      //   // END TODO update to core

      //   total_success++;
      // }

      // console.log(
      //   `[BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE] Success soft deleting ${total_success} vouchers [CORE].  ${this.getTime(
      //     start,
      //   )}`,
      // );
      // === END CORE UPDATE ===
    } catch (err: any) {
      console.error(
        '[BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE] An error occured when soft deleting vouchers!',
        err,
      );

      return {
        is_error: true,
        message: err?.message,
      };
    }

    console.log(`[BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE] Operation completed!`);

    return {
      is_error: false,
      message: JSON.stringify({
        total_success,
        total_fail,
      }),
    };
  }
  /**
   * 2. Bulk update voucher to Expired if end_time < sysdate
   * db.transaction_voucher.updateMany({ end_time: { $lte: new Date() }}, { $set: { status: "Expired" }});
   */
  async bulkUpdateVoucherToExpired() {
    let start = Date.now();
    let total_success = 0;
    let total_fail = 0;

    const sysdate = moment().endOf('days').subtract(1, 'days');
    console.log(
      `[BULK_VOUCHER_EXPIRED] Attempting to update all voucher with end_date is lower than ${sysdate.format(
        'YYYY-MM-DD',
      )} to 'Expired'`,
    );

    try {
      // get all expired vouchers
      const selectedVouchers = await this.voucherModel.find(
        {
          end_time: {
            $lt: sysdate,
          },
          status: {
            $ne: 'Expire',
          },
        },
        {
          _id: 1,
          'responseBody.voucher_code': 1,
        },
      );

      console.log(
        `[BULK_VOUCHER_EXPIRED] ${selectedVouchers?.length} marked as 'Expired'`,
      );

      // === START NON-CORE UPDATE ===
      const selectedVouchersIds = selectedVouchers.map((el) =>
        el._id?.toString(),
      );

      const updateManyResult = await this.voucherModel.updateMany(
        {
          _id: {
            $in: selectedVouchersIds,
          },
        },
        {
          $set: {
            status: 'Expire',
          },
        },
      );

      console.log(
        `[BULK_VOUCHER_EXPIRED] Success updating ${
          updateManyResult?.modifiedCount
        } voucher status to 'Expired' [NON-CORE]. ${this.getTime(start)}`,
      );

      total_success = updateManyResult?.modifiedCount;

      // === END NON-CORE UPDATE ===

      // === START CORE UPDATE ===
      // start = Date.now();

      // for (let i = 0; i < selectedVouchers?.length; i++) {
      //   const oneVoucher = selectedVouchers[i];

      //   // TODO update to core
      //   // END TODO update to core

      //   total_success++;
      // }

      // console.log(
      //   `[BULK_VOUCHER_EXPIRED] Success updating ${total_success} voucher status to 'Expired' [CORE].  ${this.getTime(
      //     start,
      //   )}`,
      // );
      // === END CORE UPDATE ===
    } catch (err: any) {
      console.error(
        '[BULK_VOUCHER_EXPIRED] An error occured when update voucher to expired!',
        err,
      );

      return {
        is_error: true,
        message: err?.message,
      };
    }

    console.log(`[BULK_VOUCHER_EXPIRED] Operation completed!`);

    return {
      is_error: false,
      message: JSON.stringify({
        total_success,
        total_fail,
      }),
    };
  }
}

export interface VoucherCorePrimeTemplate {
  token?: string;
  first?: number;
  rows?: number;
  sortField?: string;
  sortOrder?: number;
  filters?: object;
}

export interface VoucherCorePrimeResponse {
  code: string;
  message: any;
  description: string;
  payload: {
    totalRecords: number;
    data: [];
  };
}

export interface ViewVoucherCoreFilter {
  token?: string;
  locale?: string;
  limit?: string | number;
  skip?: string | number;
  filter?: object;
  projection?: object;
  addon?: object;
  sort?: object;
  realm_id?: string;
  branch_id?: string;
  merchant_id?: string;
  export_field?: object;
  action?: string;
}

export interface VoucherPatchPayload {
  authorizationToken: string;
  locale?: string;
  criteria: {
    status?: string;
    batch_no: string;
  };
  use_cron_job?: boolean;
  status?: string;
  merchant_id?: string;
  realm_id?: string;
  branch_id?: string;
}
