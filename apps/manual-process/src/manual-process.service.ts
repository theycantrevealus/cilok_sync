import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as process from 'process';

import {
  BatchProcessLogEnum,
  BatchProcessLogRowDocument,
  BatchProcessRowLog,
} from '@/application/models/batch-row.log.model';

import { UtilsService } from '../../utils/services/utils.service';
import {
  DataRowParameters,
  GoogleTrxCriteriaValue,
  GoogleTrxParameters,
  ProcessDataRowPayload,
  TransferPulsaParameters,
} from './models/manual-process.dto';

@Injectable()
export class ManualProcessService {
  private readonly logger = new Logger(ManualProcessService.name);
  private readonly token: string;

  constructor(
    @Inject('MANUAL_PROCESS_PRODUCER')
    private readonly clientManualProcess: ClientKafka,

    @InjectModel(BatchProcessRowLog.name)
    private batchProcessRowLog: Model<BatchProcessLogRowDocument>,

    @Inject(UtilsService)
    private readonly utilsService: UtilsService,
  ) {
    this.token = process.env.ACCOUNT_TOKEN;
  }

  async refreshToken(): Promise<string> {
    const signIn: any = await this.utilsService.getToken();
    console.log(signIn.payload.access_token);
    return signIn.payload.access_token;
  }

  /**
   * For process transfer pulsa transaction
   * @param payload
   */
  async transferPulsa(payload: ProcessDataRowPayload) {
    const parameters = payload.parameters as TransferPulsaParameters;

    // set token from env
    payload.payload.token = `Bearer ${await this.refreshToken()}`;

    const payloadData = {
      data: {
        msisdn: payload.data.msisdn,
        keyword: payload.data.keyword,
        total_coupon: 1,
      },
      payload: payload.payload,
      id_process: payload.id_process,
    };
    await this.clientManualProcess.emit(parameters.next_topic, payloadData);
  }

  /**
   * For process google transaction (NBP)
   * @param payload
   */
  async googleTransaction(payload: ProcessDataRowPayload) {

    const parameters = payload.parameters as GoogleTrxParameters;

    const filterConfig = parameters.filter_config;
    if (filterConfig.length === 0) {
      this.logger.warn('No filter implemented');
      // return false;
    }

    // checking filter
    const data = payload.data;
    for (let i = 0; i < filterConfig.length; i++) {
      if (data.hasOwnProperty(filterConfig[i].field)) {
        const isEligible = this.filterDataCheck(
          filterConfig[i].operator,
          filterConfig[i].value,
          data[filterConfig[i].field],
        );

        if (!isEligible) {
          const failLog = new this.batchProcessRowLog({
            batch_id: payload.id_process,
            filename: payload.payload.filename,
            line_data: payload.data,
            status: BatchProcessLogEnum.FAIL,
            trace_id: '',
            error: 'Does not meet the criteria',
          });
          await failLog.save();

          this.logger.warn(`Skip Data... ${data}`);
          return false;
        }
      }
    }

    // set token from env
    payload.payload.token = `Bearer ${await this.refreshToken()}`;

    // check transaction criteria
    const criteria = parameters.criteria;
    if (criteria.type === GoogleTrxCriteriaValue.MULTIPLE) {
      const divider = criteria.start_value;
      const price = data.price;
      const totalCoupon = Math.floor(price / divider);

      const payloadData = {
        data: {
          msisdn: payload.data.msisdn,
          keyword: payload.data.keyword,
          total_coupon: totalCoupon,
        },
        payload: payload.payload,
        id_process: payload.id_process,
      };
      await this.clientManualProcess.emit(parameters.next_topic, payloadData);
    } else if (criteria.type === GoogleTrxCriteriaValue.POIN_RANGE) {
      // todo, check poin range
    }
  }

  /**
   * Check for custom data
   * @param operator
   * @param comparisonVal
   * @param value
   */
  filterDataCheck(
    operator: string,
    comparisonVal: string,
    value: string,
  ): boolean {
    let result = false;

    switch (operator) {
      case 'LessThan':
        if (value < comparisonVal) result = true;
        break;

      case 'LessThanOrEqualTo':
        if (value <= comparisonVal) result = true;
        break;

      case 'EqualTo':
        if (value === comparisonVal) result = true;
        break;

      case 'MoreThan':
        if (value > comparisonVal) result = true;
        break;

      case 'MoreOrEqualTo':
        if (value >= comparisonVal) result = true;
        break;
    }

    return result;
  }
}
