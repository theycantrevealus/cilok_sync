import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import {
  TransactionMaster,
  TransactionMasterDocument,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
import * as moment from 'moment';
import { Date, Model } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import { ProgramDocument } from '@/program/models/program.model';
import { ProgramV2 } from '@/program/models/program.model.v2';
import {
  CheckCustPotentialPointParamDTOParamDTO,
  CheckCustPotentialPointParamDTOQueryDTO,
  CheckTransactionParamDTOParamDTO,
  CheckTransactionParamDTOQueryDTO,
} from '@/transaction/dtos/transaction.dto';
import { CallbackService } from '@/transaction/services/callback/callback.service';

@Injectable()
export class TransactionService {
  private httpService: HttpService;
  private keywordService: KeywordService;
  private callbackService: CallbackService;
  private url: string;
  private realm: string;
  private branch: string;
  private logger = new Logger('HTTP');

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    keywordService: KeywordService,
    callbackService: CallbackService,
    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramDocument>,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.httpService = httpService;
    this.keywordService = keywordService;
    this.callbackService = callbackService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
  }

  async check_customer_potetial_point(
    param: CheckCustPotentialPointParamDTOParamDTO,
    query: CheckCustPotentialPointParamDTOQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = {
      trace_id: true,
      current_treshold: 50000,
      total_buffer: 20000,
      total_remaining: 30000,
      indicator_reach_threshold: 'N',
      earning_point: 0,
      potential_point: 2,
    };
    return response;
  }

  // @Cron('* * * * * *')
  // handleCron() {
  //   console.log('tes');
  // }

  @Cron('4 * * * * *', {
    name: 'messaging',
    timeZone: 'America/New_York',
  })
  handleCron() {
    // console.log('Triggering Message Sending');
  }

  // stopCronJob() {
  //   const job = this.schedulerRegistry.getCronJob('messaging');
  //   job.start();
  // }

  async check_transaction(
    headers: any,
    param: CheckTransactionParamDTOParamDTO,
    query: CheckTransactionParamDTOQueryDTO,
    oauth = false,
    linkaja = false,
  ): Promise<GlobalTransactionResponse> {
    // skip if using oauth
    if (!oauth) {
      // check auth
      console.log(headers.authorization, 'headers.authorization');
      const allowed = await this.callbackService.checkAuth(
        headers.authorization,
      );
      if (!allowed) {
        throw new BadRequestException([{ isUnauthorized: '' }]);
      }
    }

    const checkData = await this.transactionMasterModel.findOne({
      msisdn: param.msisdn,
      transaction_id: query.ref_transaction_id,
      // ...query,
    });

    const response = new GlobalTransactionResponse();
    if (checkData) {
      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      // response.transaction_classify = 'CHECK-TRANSACTION';
      response.payload = {
        msisdn: param.msisdn,
        transaction_id: checkData.transaction_id,
      };

      if (linkaja) {
        const status =
          checkData.status == 'Partial' ? 'Inprogress' : checkData.status;

        response.payload = {
          ...response.payload,
          status: status,
          transaction_date: moment(checkData.transaction_date).format(
            'YYYY-MM-DDTHH:mm:ss.SSSZ',
          ),
        };
      }

      return response;
    } else {
      throw new BadRequestException([
        { isNotFoundGeneral: 'Transaction Not Found' },
      ]);
    }
  }

  // ==========================================
  async eligibility_check(keyword: string, program: string) {
    // TODO : Eligi is here todo
  }

  async getKeywordProfile(param: string) {
    return await this.keywordService.getkeywordProfile(param);
  }

  async getProgramProfile(param: string) {
    return await this.programModel
      .findOne({
        $and: [{ name: param }, { deleted_at: null }],
      })
      .exec();
  }

  async eligibility_check_keyword_schedule(param: string) {
    const submit_time = new TimeManagement().getTimezoneV2('Asia/Jakarta');
    const keyword = await this.getKeywordProfile(param);

    const keyword_start_period = keyword.start_period.toISOString();
    const keyword_end_period = keyword.end_period.toISOString();

    if (keyword.keyword_schedule === 'Daily') {
      if (
        submit_time.split(' ', 1)[0] >=
          keyword_start_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0] &&
        submit_time.split(' ', 1)[0] <=
          keyword_end_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0]
      ) {
        return {
          eligible: true,
          reason: '',
        };
      } else {
        return {
          eligible: false,
          reason: '',
        };
      }
    }

    if (keyword.keyword_schedule === 'Shift') {
      if (
        submit_time.split(' ', 1)[0] >=
          keyword_start_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0] &&
        submit_time.split(' ', 1)[0] <=
          keyword_end_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0]
      ) {
        const keyword_shift = keyword.keyword_shift.map((keyword_shiftItem) => {
          const from = keyword_shiftItem.from
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 2)[1];
          const to = keyword_shiftItem.to
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 2)[1];
          if (
            submit_time.split(' ', 2)[1] >= from &&
            submit_time.split(' ', 2)[1] <= to
          ) {
            return {
              eligible: true,
              reason: '',
            };
          } else {
            return {
              eligible: false,
              reason: '',
            };
          }
        });
        return keyword_shift[0];
      } else {
        return {
          eligible: false,
          reason: '',
        };
      }
    }
  }

  async eligibility_check_start_end_period(keyword: string, program: string) {
    const submit_time = new TimeManagement().getTimezoneV2('Asia/Jakarta');
    if (keyword) {
      const getkeyword = await this.getKeywordProfile(keyword);

      const keyword_start_period = getkeyword.start_period.toISOString();
      const keyword_end_period = getkeyword.end_period.toISOString();

      if (
        submit_time.split(' ', 1)[0] >=
          keyword_start_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0] &&
        submit_time.split(' ', 1)[0] <=
          keyword_end_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0]
      ) {
        return {
          eligible: true,
          reason: '',
        };
      } else {
        return {
          eligible: false,
          reason: '',
        };
      }
    }
    if (program) {
      const getProgram = await this.getProgramProfile(program);
      if (
        submit_time.split(' ', 1)[0] >=
          getProgram.start_period
            .toJSON()
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0] &&
        submit_time.split(' ', 1)[0] <=
          getProgram.start_period
            .toJSON()
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0]
      ) {
        return {
          eligible: true,
          reason: '',
        };
      } else {
        return {
          eligible: false,
          reason: '',
        };
      }
    }
  }
}
