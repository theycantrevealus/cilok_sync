import { SystemConfig, SystemConfigDocument } from '@/application/models/system.config.model';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ProgramV2, ProgramV2Document } from '@/program/models/program.model.v2';
import { SendNotificationService } from '@/application/services/send-notification.service';


@Injectable()
export class KeywordExpiredAlertSpecificJobService {

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
      const dateExp = new Date(qKeyword[i].eligibility.end_period);
      const progId: any = qKeyword[i].eligibility.program_id;
      const objProgId = new mongoose.Types.ObjectId(progId);
      const qProg = await this.programModel.findById(objProgId, 'name desc program_owner_detail threshold_alarm_expired').exec();

      const generalTreshold = qProg.threshold_alarm_expired;
      const notifDate = this.getNotifDate(dateExp, generalTreshold);
      const dateNow = new Date();


      if (dateNow >= notifDate && dateNow <= dateExp) {
        let recepients = qProg.alarm_pic;

        let param = {
          email: recepients,
          title: 'Keyword To Be Expired Notification Threshold by Program',
          template: 'keyword_expired_alert_specific',
        }
        this.sendNotifService.send_notification(qKeyword[i].eligibility.name,null,param);

      }

    } //end for

  }

  getNotifDate(dateExp, generalTreshold) {
    var notifDate = null;
    var timeCalculate = parseFloat(generalTreshold);
    if (timeCalculate >= 1) {
      notifDate = new Date(dateExp);
      notifDate.setDate(notifDate.getDate() - Math.round(timeCalculate));
    }
    var timeCalculate = parseFloat(generalTreshold) * 24;
    if (timeCalculate >= 1 && notifDate === null) {
      notifDate = new Date(dateExp);
      notifDate.setHours(notifDate.getHours() - Math.round(timeCalculate));
    }
    var timeCalculate = parseFloat(generalTreshold) * 24 * 60;
    if (timeCalculate >= 1 && notifDate === null) {
      notifDate = new Date(dateExp);
      notifDate.setMinutes(notifDate.getMinutes() - Math.round(timeCalculate));
    }
    var timeCalculate = parseFloat(generalTreshold) * 24 * 60 * 60;
    if (timeCalculate >= 1 && notifDate === null) {
      notifDate = new Date(dateExp);
      notifDate.setSeconds(notifDate.getSeconds() - Math.round(timeCalculate));
    }
    return notifDate;
  }

}
