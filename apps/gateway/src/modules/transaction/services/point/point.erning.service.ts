import { ReportingServiceResult } from "@fmc_reporting_generation/model/reporting_service_result";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices/client";
import { InjectModel } from "@nestjs/mongoose";
import {
  PrepaidGranularLog,
  PrepaidGranularLogEnum,
  PrepaidGranularTransactionEnum,
} from '@prepaid_granular/models/prepaid_granular_log';
import { UtilsService } from "@utils/services/utils.service";
import { Model } from "mongoose";
import { firstValueFrom } from "rxjs";

@Injectable()
export class PointEarningService {
  constructor(
    @InjectModel(PrepaidGranularLog.name)
    private prepaidGranularLogModel: Model<PrepaidGranularLog>,
    private utilsService: UtilsService,
    @Inject('STORE_DATA_ROW_SERVICE_PRODUCER')
    private readonly clientStoreDataRow: ClientKafka,
  ){}

   /**
   * process to retry earning point!
   */
  async cronEarningRetry(): Promise<ReportingServiceResult> {
    const signIn = await this.utilsService.getToken();
    if (signIn.status !== HttpStatus.OK) {
      return new ReportingServiceResult({
        is_error: true,
        message: 'ERROR EARNING_POINT CRON : get token failed!',
      });
    } else {
     const token = `Bearer ${signIn.payload.access_token}`;
     try {
      const earningFaileds = await this.prepaidGranularLogModel.find({
        status: PrepaidGranularLogEnum.FAIL,
        transaction_name : PrepaidGranularTransactionEnum.EARN,
        is_processed: false
      })
      
      const payload = {
        origin : 'EARNING_POINT',
        file : 'earning_point_retry',
        token : token
      }

      if (earningFaileds.length > 0) {
        for (const earningFail of earningFaileds) {
          await firstValueFrom(
            this.clientStoreDataRow.emit('store_data_row', {
              payload,
              id_process: earningFail._id,
              message: "EARNING_POINT FROM CRON",
              data: earningFail.payload
            })
          );   
        }
        
        return new ReportingServiceResult({
          is_error: false,
          message: 'SUCCESS EARNING_POINT CRON : to retry earning point, total ' + earningFaileds.length
        });
      } else {
        return new ReportingServiceResult({
          is_error: false,
          message: 'SUCCESS EARNING_POINT CRON : with 0 data'
        });
      }
     } catch (error) {
      return new ReportingServiceResult({
        is_error: true,
        message: 'ERROR EARNING_POINT CRON : '+ error?.message,
      });
     }
    }
  }
}
