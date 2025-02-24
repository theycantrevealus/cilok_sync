import { SystemConfig, SystemConfigDocument } from '@/application/models/system.config.model';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ProgramV2, ProgramV2Document } from '@/program/models/program.model.v2';
import { Location, LocationDocument } from '@/location/models/location.model';
import { MailService } from '@/mail/service/mail.service';
import { SendNotificationService } from '@/application/services/send-notification.service';


@Injectable()
export class KeywordExpiredAlertGeneralJobService {

  constructor(
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    private mailerService: MailService,
    private sendNotifService: SendNotificationService,

  ) {

  }

  runTheJobs(cronSetup) {
    this.job1(cronSetup);
  }

  async job1(cronSetup): Promise<any> {
    const qConfig = await this.lovModel.findOne(
      {
        group_name: cronSetup.group_name,
        set_value: cronSetup.set_value
      }
    ).exec();
    const emails = qConfig.additional.data.recipient;

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

    var data = [];
    for (let i = 0; i < qKeyword.length; i++) {

      // check date treshold validation
      const dateExp = new Date(qKeyword[i].eligibility.end_period);
      const qConfig = await this.lovModel
        .findOne({
          group_name: cronSetup.group_name,
          set_value: cronSetup.set_value
        })
        .exec();
      const generalTreshold = qConfig.additional.data.treshold;
      const notifDate = this.getNotifDate(dateExp, generalTreshold);
      const dateNow = new Date();

      // console.log(dateExp);
      // console.log(notifDate);
      // console.log(dateNow);

      if (dateNow >= notifDate && dateNow <= dateExp) {
        // expired
        const end_period = new Date(qKeyword[i].eligibility.end_period);
        const expired = end_period.getDate().toString() + '-' + end_period.getMonth().toString() + '-' + end_period.getFullYear().toString();

        // program name
        const progId: any = qKeyword[i].eligibility.program_id;
        const objProgId = new mongoose.Types.ObjectId(progId);
        const qProg = await this.programModel.findById(objProgId, 'name desc program_owner_detail').exec();

        // program location
        const locId: any = qProg.program_owner_detail;
        const obLocId = new mongoose.Types.ObjectId(locId);
        const qLoc = await this.locationModel.findById(obLocId, 'name').exec();

        data[i] = {
          program_name: qProg.name,
          keyword_name: qKeyword[i].eligibility.name,
          expired: expired,
          location: qLoc.name,
          notes: qProg.desc,
        };

      }

    } //end for

    // console.log(data);
    if (data.length !== 0) {
      const dataEmail = {
        title: 'Keyword To Be Expired Notification General Threshold',
        data: data,
        template: 'keyword_expired_alert_general'
      }
      await this.mailerService.sendMailConfirmation(emails, dataEmail)
    } else {
      const dataEmail = {
        title: 'Keyword To Be Expired Notification General Threshold',
        data: data,
        template: 'keyword_expired_alert_general'
      }
      const param = {
        email:emails,
        data:dataEmail
      }
      this.sendNotifService.send_notification('MULTIVIA',null,param);
      console.log(`Cronjob: ${cronSetup.set_value} is running. (no data, no send email alert)`);
    }


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
