import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { allowedIndihomeNumber } from '@/application/utils/Msisdn/formatter';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { RedeemFmcDTO } from '../../dtos/redeem/redeem.fmc.dto';
import { RedeemService } from './redeem.service';

@Injectable()
export class RedeemFmcService {
  constructor(
    @Inject('REDEEM_FMC_SERVICE_PRODUCER')
    private readonly clientRedeem: ClientKafka,

    @Inject('REDEEM_HIGH_SERVICE_PRODUCER')
    private readonly clientRedeemHigh: ClientKafka,

    @Inject('REDEEM_LOW_SERVICE_PRODUCER')
    private readonly clientRedeemLow: ClientKafka,

    @Inject('REDEEM_SERVICE_PRODUCER')
    private readonly clientRedeemBAU: ClientKafka,

    @Inject(TransactionOptionalService)
    private readonly transactionOptional: TransactionOptionalService,

    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,

    @Inject(RedeemService)
    private readonly redeemService: RedeemService,
  ) {}

  // async redeemV2(
  //   request: RedeemFmcDTO,
  //   account: Account,
  //   token = '',
  //   path = '',
  //   emit_action = true,
  // ) {
  //   if (request?.channel_id) {
  //     const channel_id = request?.channel_id ?? '';
  //     request.channel_id = channel_id.toUpperCase();
  //     console.log('request.channel_id : ', request?.channel_id);
  //   }

  //   const response = new GlobalTransactionResponse();
  //   response.transaction_classify = 'REDEEM';
  //   response.trace_custom_code = 'TRX';

  //   // generate trace_id
  //   const trace_id = this.transactionOptional.getTracingId(request, response);

  //   response.payload = {
  //     trace_id: trace_id,
  //   };

  //   if (request.total_redeem < 0) {
  //     throw new BadRequestException([
  //       { isInvalidDataContent: 'Keyword parameter format is wrong!' },
  //     ]);
  //   }

  //   // TODO : [TANAKA] total_bonus handling from BAU. Priority keyword preparation before emit (Used for Multi bonus)

  //   if (
  //     !request.hasOwnProperty('send_notification') ||
  //     request.send_notification === undefined
  //   ) {
  //     request.send_notification = true;
  //   }

  //   if (emit_action) {
  //     /*
  //      * TANAKA
  //      * If service number is msisdn, emit to redeem. If indihome number, emit to redeem_fmc
  //      * */

  //     const redeem_fmc_switch: boolean =
  //       await this.applicationService.getConfig('REDEEM_FMC_MSISDN_TO_BAU');

  //     if (redeem_fmc_switch) {
  //       const isIndihome = allowedIndihomeNumber(request.msisdn);

  //       if (!isIndihome && !request.tsel_id) {
  //         // If not indihome and tsel id is not set then emit to redeem

  //         const priorityKeyword =
  //           await this.applicationService.checkKeywordPriority(request.keyword);
  //         console.log('priorityKeyword', priorityKeyword);

  //         const keyword_priority = priorityKeyword
  //           ? priorityKeyword?.priority?.toUpperCase()
  //           : 'DEFAULT';

  //         this.BAUemitToTopic(
  //           {
  //             data: request,
  //             account: account,
  //             token: token,
  //             transaction_id: trace_id,
  //             path: path,
  //             keyword_priority: keyword_priority,
  //           },
  //           keyword_priority,
  //         ).then((_) => {
  //           //
  //         });
  //       } else {
  //         // FMC redeem
  //         this.emitToTopic('redeem_fmc', {
  //           data: request,
  //           account: account,
  //           token: token,
  //           transaction_id: trace_id,
  //           path: path,
  //         }).then();
  //       }
  //     } else {
  //       this.emitToTopic('redeem_fmc', {
  //         data: request,
  //         account: account,
  //         token: token,
  //         transaction_id: trace_id,
  //         path: path,
  //       }).then();
  //     }
  //   }
  //   response.code = HttpStatusTransaction.CODE_SUCCESS;
  //   response.message = 'Success';

  //   return response;
  // }

  // async emitToTopic(topic: string, data: any) {
  //   this.clientRedeem.emit(topic, data);
  // }

  // async BAUemitToTopic(data: any, keyword_priority = null) {
  //   const key = randomUUID();
  //   console.log('KEY_KAFKA_EMIT --> ', key);

  //   if (keyword_priority === 'HIGH') {
  //     this.clientRedeemHigh.emit(process.env.KAFKA_REDEEM_HIGH_TOPIC, {
  //       key: key,
  //       value: data,
  //     });
  //   } else if (keyword_priority === 'LOW') {
  //     this.clientRedeemLow.emit(process.env.KAFKA_REDEEM_LOW_TOPIC, {
  //       key: key,
  //       value: data,
  //     });
  //   } else {
  //     this.clientRedeemBAU.emit(process.env.KAFKA_REDEEM_TOPIC, {
  //       key: key,
  //       value: data,
  //     });
  //   }
  // }

  async redeemV2(
    request: RedeemFmcDTO,
    account: Account,
    token = '',
    path = '',
    emit_action = true,
    overwrite_priority = null,
  ) {
    const redeem_fmc_switch: boolean = await this.applicationService.getConfig(
      'REDEEM_FMC_MSISDN_TO_BAU',
    );

    return await this.redeemService.redeem_v2_topic(
      request,
      account,
      token,
      path,
      emit_action,
      overwrite_priority,
      {
        is_v2: true,
        redeem_fmc_switch: redeem_fmc_switch,
        request: request,
      },
    );
  }
}
