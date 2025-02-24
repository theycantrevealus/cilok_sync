import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import {
  BatchProcessLogEnum,
  BatchProcessLogRowDocument,
  BatchProcessRowLog,
} from '@/application/models/batch-row.log.model';
import { formatMsisdnCore } from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { KeywordService } from '@/keyword/services/keyword.service';
import { LovService } from '@/lov/services/lov.service';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';

import { ManualRedeemLogService } from '../log.service';

@Injectable()
export class TransferPulsaService {
  constructor(
    private readonly keywordService: KeywordService,
    private readonly customerService: CustomerService,
    private readonly programService: ProgramServiceV2,
    private readonly lovService: LovService,
    private readonly manualRedeemLogService: ManualRedeemLogService,

    @Inject('STORE_DATA_ROW_SERVICE_PRODUCER')
    private readonly clientStoreDataRow: ClientKafka,

    @InjectModel(BatchProcessRowLog.name)
    private batchProcessRowLogModel: Model<BatchProcessLogRowDocument>,
  ) {}

  async processRedeem(payload: any) {
    const start = new Date();

    const data = payload.data;
    const params = payload.parameters;

    this.manualRedeemLogService.verbose(
      payload,
      {
        data: data,
        params: params,
      },
      `[MANUAL_REDEEM - ${payload?.transaction}] Start ...`,
      start,
    );

    try {
      const keyword = await this.keywordService.getKeywordByName(data.keyword);
      if (!keyword) {
        console.log('Keyword not found!');

        await this.manualRedeemLogService.error(
          payload,
          start,
          `[MANUAL_REDEEM - ${payload?.transaction}] Keyword not found! Keyword name: ${data?.keyword}`,
        );

        return false;
      }

      this.manualRedeemLogService.verbose(
        payload,
        {
          data: data,
          params: params,
          keyword: keyword,
        },
        `[MANUAL_REDEEM - ${
          payload?.transaction
        }] Keyword found! Keyword: ${JSON.stringify(keyword)}`,
        start,
      );

      const program = await this.programService.getProgramByID(
        keyword.eligibility.program_id,
      );
      if (!program) {
        console.log('Program not found!');

        await this.manualRedeemLogService.error(
          payload,
          start,
          `[MANUAL_REDEEM - ${payload?.transaction}] Program not found! Program id: ${keyword.eligibility.program_id}`,
        );

        return false;
      }

      this.manualRedeemLogService.verbose(
        payload,
        {
          data: data,
          params: params,
          keyword: keyword,
          program: program,
        },
        `[MANUAL_REDEEM - ${payload?.transaction}] Program found! Program: ${program}`,
        start,
      );

      const lovData = await this.lovService.getLovData(
        program.point_type.toString(),
      );
      if (!lovData) {
        console.log('LOV (point_type) not found!');

        await this.manualRedeemLogService.error(
          payload,
          start,
          `[MANUAL_REDEEM - ${
            payload?.transaction
          }] LOV (point_type) not found! Id: ${program.point_type.toString()}`,
        );

        return false;
      }

      const lovAdditional = lovData.additional.split('|');
      const reformatMsisdn = formatMsisdnCore(data.msisdn);

      this.manualRedeemLogService.verbose(
        payload,
        {
          data: data,
          params: params,
          keyword: keyword,
          program: program,
          lov_point_type: lovData,
        },
        `[MANUAL_REDEEM - ${payload?.transaction}] LOV (point_type) found! LOV (point_type): ${lovAdditional[1]}`,
        start,
      );

      const customer: any = await this.customerService.check_member_core(
        reformatMsisdn,
        params.token,
        lovAdditional[1],
      );

      if (!customer) {
        console.log('Customer balance not found!');

        await this.manualRedeemLogService.error(
          payload,
          start,
          `[MANUAL_REDEEM - ${payload?.transaction}] Customer balance not found! Msisdn: ${reformatMsisdn}`,
        );

        return false;
      }

      this.manualRedeemLogService.verbose(
        payload,
        {
          data: data,
          params: params,
          keyword: keyword,
          program: program,
          lov_point_type: lovData,
          customer: customer,
        },
        `[MANUAL_REDEEM - ${
          payload?.transaction
        }] Customer found! Customer: ${JSON.stringify(customer)}`,
        start,
      );

      const balance = customer?.balance;
      if (balance <= 1) {
        console.log('Balance is lower than or equal with 1');

        await this.manualRedeemLogService.error(
          payload,
          start,
          `[MANUAL_REDEEM - ${payload?.transaction}] Balance is lower than or equal with 1! Customer ${reformatMsisdn} balance is ${balance}`,
        );

        return false;
      }

      const payloadData = payload.data;
      // emit emit
      this.clientStoreDataRow.emit('store_data_row', {
        payload: {
          ...payload.payload,
          file: payload.payload.filename,
          token: payload.parameters.token,
        },
        data: payloadData,
        id_process: payload.id_process,
      });
      this.manualRedeemLogService.verbose(
        payload,
        {
          data: data,
          params: params,
        },
        `[MANUAL_REDEEM - ${payload?.transaction}] Success! And emiting to 'store_data_row' ...`,
        start,
      );

      return true;
    } catch (err) {
      console.error(err);

      await this.manualRedeemLogService.error(
        payload,
        start,
        `[MANUAL_REDEEM - ${payload?.transaction}] An error occured! Error: ${err?.message}`,
        err?.stack ?? {},
      );

      return false;
    }
  }
}
