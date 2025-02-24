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
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import { UtilsService } from '@utils/services/utils.service';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import {
  ExternalBonusEnum,
  ExternalBonusLog,
} from '@/application/models/external-bonus.model';
import { formatMsisdnCore } from '@/application/utils/Msisdn/formatter';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { PostpaidCallbackQueryDTO } from '@/transaction/dtos/callback/callback.dto';
import {
  CallbackAuth,
  CallbackAuthDocument,
} from '@/transaction/models/callback/callback.auth.model';
import {
  CallbackTransaction,
  CallbackTransactionDocument,
} from '@/transaction/models/callback/callback.transaction.model';
import {
  CallbackPostpaid,
  CallbackPostpaidDocument,
} from '@/transaction/models/callback/postpaid.callback.model';
import {
  CallbackPrepaid,
  CallbackPrepaidDocument,
} from '@/transaction/models/callback/prepaid.callback.model';
import { PointService } from '@/transaction/services/point/point.service';

@Injectable()
export class CallbackService {
  private urlSL: string;
  constructor(
    @InjectModel(CallbackAuth.name)
    private callbackAuthModel: Model<CallbackAuthDocument>,

    @InjectModel(CallbackTransaction.name)
    private callbackTransactionModel: Model<CallbackTransactionDocument>,

    @InjectModel(CallbackPrepaid.name)
    private prepaidCallbackModel: Model<CallbackPrepaidDocument>,

    @InjectModel(CallbackPostpaid.name)
    private postpaidCallbackModel: Model<CallbackPostpaidDocument>,

    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,

    @InjectModel(ExternalBonusLog.name)
    private externalBonusLogModel: Model<ExternalBonusLog>,

    configService: ConfigService,

    @Inject(UtilsService)
    private utilsService: UtilsService,

    @Inject(AccountService)
    private readonly accountService: AccountService,

    @Inject(PointService)
    private pointService: PointService,

    @Inject('CALLBACK_SERVICE_PRODUCER')
    private readonly clientCallback: ClientKafka,

    @Inject('MULTI_BONUS_SERVICE_PRODUCER')
    private readonly clientMultiBonus: ClientKafka,
  ) {
    this.urlSL = `${configService.get<string>('application.hostport')}`;
  }

  async callback_transaction(
    request: CallbackTransaction,
    account: Account,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    const newData = new this.callbackTransactionModel({
      ...request,
      created_by: account,
    });

    return await newData
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = 'CALLBACK_TRANSACTION';
        response.payload = {
          trace_id: true,
        };
        return response;
      });
  }

  public async checkAuth(token: string) {
    if (!token) return false;

    try {
      const CryptoJS = require('crypto-js');
      const words = CryptoJS.enc.Base64.parse(token);
      const decode = CryptoJS.enc.Utf8.stringify(words);
      const userData = decode.split(':');

      const user = await this.callbackAuthModel.findOne({
        username: userData[0],
      });
      const bytes = CryptoJS.AES.decrypt(
        user.password,
        process.env.SECRET_KEY_CALLBACK,
      );
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (originalText !== userData[1]) return false;
      return user;
    } catch (err) {
      console.error('BASIC CHECK AUTH ERROR', JSON.stringify(err, null, 4));
      return false;
    }
  }

  async prepaid_callback(
    headers: any,
    request: CallbackPrepaid,
    account: Account,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    // check auth
    console.log(headers.authorization, 'headers.authorization');
    const allowed = await this.checkAuth(headers.authorization);
    if (!allowed) {
      throw new BadRequestException([{ isUnauthorized: '' }]);
    }

    console.log('-------CALLBACK-DOM----------');
    console.log(request);

    let prepaidCallback = await this.prepaidCallbackModel.findOne({
      transaction_id: request.transaction_id,
    });

    if (prepaidCallback) {
      prepaidCallback.service_id_a = request.service_id_a;
      prepaidCallback.service_id_b = request.service_id_b;
      prepaidCallback.error_code = request.error_code;
      prepaidCallback.detail_code = request.detail_code;
      prepaidCallback.charging_orderid = request.charging_orderid;
    } else {
      prepaidCallback = new this.prepaidCallbackModel({
        ...request,
        created_by: allowed, // account,
      });
    }

    return await prepaidCallback
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(async (data) => {
        const trxId = request.transaction_id;

        // get transaction data
        const trxData = await this.transactionMasterModel.findOne({
          transaction_id: trxId,
        });
        if (trxData) {
          // update status
          if (!request.error_code) {
            trxData.status = 'Success';
          } else {
            trxData.status = 'Fail';
          }

          // check status
          let refund = undefined;
          // check status
          if (request.error_code !== 'OK00' && request.error_code !== '0000') {
            trxData.status = 'Fail';
            const response = await this.refundTransaction('prepaid', trxData);
            refund = {
              refund_trx_id: response?.payload?.trace_id,
            };
          } else {
            trxData.status = 'Success';

            // multi bonus emit
            await this.emitToMultiBonus({
              transaction_id: trxId,
              transaction: trxData,
            });
          }

          // save
          await trxData.save();

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          // response.transaction_classify = 'CALLBACK_PROVISIONING_PREPAID_PRODUCT';
          response.payload = {
            trace_id: trxId,
            refund,
          };
        } else {
          response.code = HttpStatusTransaction.ERR_NOT_FOUND;
          response.message = 'Not Found';
          response.payload = {};
        }

        // emit to callback
        if (data.payload) {
          console.log(`------------callback-dom-triggered-${trxId}-----------`);
          const payload: any = data.payload;
          payload.status =
            request.error_code == 'OK00' || request.error_code == '0000'
              ? 'success'
              : 'fail';
          this.clientCallback.emit(process.env.KAFKA_CALLBACK_TOPIC, payload);
        } else {
          console.log(
            '-------callback dom, payload not found, callback to esb not triggered--------',
          );
        }

        return response;
      });
  }

  async postpaid_callback(
    query: PostpaidCallbackQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    console.log('-----CALLBACK-PRO-------');
    console.log(query);

    let postpaidCallback = await this.postpaidCallbackModel.findOne({
      trxid: query.trxid,
    });

    if (postpaidCallback) {
      // update
      postpaidCallback.orderstatus = query.orderstatus;
      postpaidCallback.orderid = query.orderid;
      postpaidCallback.errorcode = query.errorcode;
      postpaidCallback.errormessage = query.errormessage;
    } else {
      // create
      postpaidCallback = new this.postpaidCallbackModel({
        ...query,
      });
    }

    return await postpaidCallback
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(async (data) => {
        const trxId = query.trxid;

        // ubah 62xx menjadi 08xx
        const msisdn = query.msisdn;
        // const msisdn = formatMsisdnCore(query.msisdn);

        // get transaction data
        const trxData = await this.transactionMasterModel.findOne({
          transaction_id: trxId,
          msisdn: msisdn,
        });
        if (trxData) {
          // update status
          if (!query.errorcode) {
            trxData.status = 'Success';
          } else {
            trxData.status = 'Fail';
          }

          let refund = undefined;
          // check status
          if (query.orderstatus !== 'Submitted') {
            trxData.status = 'Fail';
            const response = await this.refundTransaction('postpaid', trxData);
            refund = {
              refund_trx_id: response?.payload?.trace_id,
            };
          } else {
            trxData.status = 'Success';

            // multi bonus emit
            await this.emitToMultiBonus({
              transaction_id: trxId,
              transaction: trxData,
            });
          }

          // save
          await trxData.save();
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          // response.transaction_classify = 'CALLBACK_PROVISIONING_POSTPAID_PRODUCT';
          response.payload = {
            trace_id: trxId,
            refund,
          };
        } else {
          response.code = HttpStatusTransaction.ERR_NOT_FOUND;
          response.message = 'Not Found';
          response.payload = {};
        }

        // emit to callback
        if (data.payload) {
          console.log(`------------callback-pro-triggered-${trxId}-----------`);
          const payload: any = data.payload;
          payload.status =
            query.orderstatus == 'Submitted' ? 'success' : 'fail';
          this.clientCallback.emit(process.env.KAFKA_CALLBACK_TOPIC, payload);
        } else {
          console.log(
            '-------callback pro, payload not found, callback to esb not triggered--------',
          );
        }

        return response;
      });
  }

  private async refundTransaction(type, trxMasterData) {
    const signIn = await this.utilsService.getToken();
    const token = `${signIn.payload.access_token}`;
    const account = await this.accountService.authenticateBusiness({
      auth: 'Bearer ' + token,
    });

    const trxOutbound = await this.externalBonusLogModel.findOne({
      trace_id: trxMasterData.transaction_id,
    });

    const request: any = {
      msisdn: trxMasterData.msisdn,
      keyword: trxOutbound.keyword,
      ref_transaction_id: trxMasterData.transaction_id,
    };

    const result = await this.pointService.refundPointEmit(
      type,
      request,
      account,
      token,
    );

    if (type === 'postpaid') {
      await this.postpaidCallbackModel.updateOne(
        {
          trxid: trxMasterData.transaction_id,
        },
        {
          refund: result,
        },
      );
    } else {
      await this.prepaidCallbackModel.updateOne(
        {
          transaction_id: trxMasterData.transaction_id,
        },
        {
          refund: result,
        },
      );
    }

    return result;
  }

  private async emitToMultiBonus(payload) {
    const payloadEmit = {
      is_from_callback: true,
      ...payload,
    };

    this.clientMultiBonus.emit(
      process.env.KAFKA_MULTI_BONUS_TOPIC,
      payloadEmit,
    );
  }
}
