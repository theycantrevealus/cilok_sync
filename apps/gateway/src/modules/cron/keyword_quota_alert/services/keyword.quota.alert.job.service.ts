import { SystemConfig, SystemConfigDocument } from '@/application/models/system.config.model';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ProgramV2, ProgramV2Document } from '@/program/models/program.model.v2';
import { SendNotificationService } from '@/application/services/send-notification.service';


@Injectable()
export class KeywordQuotaAlertJobService {

  constructor(
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
    private sendNotifService: SendNotificationService,
  ) {

  }

  runTheJobs(cronSetup) {
    this.job1(cronSetup);
  }

  async job1(cronSetup): Promise<any> {
   
    // keyword expired list
    const qIsApprove = await this.systemConfigModel
      .find(
        {
          param_key: {
            $in: [
              'DEFAULT_STATUS_KEYWORD_APPROVE_NON_HQ',
              'DEFAULT_STATUS_KEYWORD_APPROVE_HQ'
            ]
          },
          set_value: 'KEYWORD_EXPIRED_ALERT'
        }
      )
      .select('param_value')
      .exec();
    const approveStatusId = qIsApprove.map(a => a.param_value);

    const qKeyword = await this.keywordModel
      .find({ keyword_approval: { $in: approveStatusId } })
      .select('eligibility.name eligibility.end_period eligibility.program_id eligibility.location_type')
      .then((results) => {
        return results;
      });

    for (let i = 0; i < qKeyword.length; i++) {

      // check date treshold validation
      const progId: any = qKeyword[i].eligibility.program_id;
      const objProgId = new mongoose.Types.ObjectId(progId);
      const qProg = await this.programModel.findById(objProgId, 'name desc program_owner_detail threshold_alarm_voucher').exec();

      const keywordQuota = 100;
      const thresholdKeywordQuota = qProg.threshold_alarm_voucher;

      if (keywordQuota <= thresholdKeywordQuota) {
        let recepients = qProg.alarm_pic;
        let param = {
          email: recepients,
          title: 'Keyword Quota Alert',
          template: 'keyword_quota_alert',
        }
        this.sendNotifService.send_notification(qKeyword[i].eligibility.name,null,param);

      }

    } //end for

  }

}
