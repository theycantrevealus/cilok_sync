import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import * as fs from 'fs';
import { Connection, Model } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  ProgramTemplist,
  ProgramTemplistDocument,
} from '@/program/models/program.templist.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';

@Processor('migration')
export class MigrationProcessor {
  private connection: Connection;

  constructor(
    @InjectConnection() connection: Connection,
    @Inject('ELIGIBILITY_SERVICE_PRODUCER')
    private readonly clientEligibility: ClientKafka,
    @Inject(TransactionOptionalService)
    private readonly transactionOptional: TransactionOptionalService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(ProgramTemplist.name)
    private programTempListModel: Model<ProgramTemplistDocument>,
  ) {
    this.connection = connection;
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is in progress now...`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is completed now...`);
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    //
  }

  @Process('migration-dci')
  async import_dci(job: Job): Promise<void> {
    const filePath = job.data.path as string;
    const timer = new TimeManagement();

    const content = fs.readFileSync(filePath, 'utf-8');
    const arrayContent = content.split('\n');

    const response = new GlobalTransactionResponse();

    for (let i = 1; i < arrayContent.length - 1; i++) {
      const explode = arrayContent[i].split(';');
      response.transaction_classify = 'REDEEM';
      response.trace_custom_code = 'TRX';
      const trace_id = this.transactionOptional.getTracingId({}, response);
      const [tmpstmp, msisdn, keyword] = explode;
      console.clear();
      console.log(job.data.token);

      await this.programTempListModel.findOneAndUpdate(
        {
          program: '6400f68c1ce7c1080676e60f',
          msisdn: `0${msisdn}`,
          location: '62ffc0fc8a01008799e785bc',
        },
        {
          program: '6400f68c1ce7c1080676e60f',
          msisdn: `0${msisdn}`,
          location: '62ffc0fc8a01008799e785bc',
          account: '63fea65201dfb4ebdd29ac9a',
          counter: 1,
          match: true,
          type: 'whitelist',
        },
        { upsert: true },
      );

      console.log({
        msisdn: `0${msisdn}`,
        origin: 'redeem',
        master_id: trace_id.replace('TRX', 'RDM'),
        tracing_id: trace_id,
        status: 'Processing',
        keyword: 'STAMP',
        send_notification: true,
        created_by: '63fea65201dfb4ebdd29ac9a',
      });

      const newData = new this.redeemModel({
        msisdn: `0${msisdn}`,
        origin: 'redeem',
        master_id: trace_id.replace('TRX', 'RDM'),
        tracing_id: trace_id,
        status: 'Processing',
        keyword: 'STAMP',
        send_notification: true,
        created_by: '63fea65201dfb4ebdd29ac9a',
      });

      await newData.save().then(async (redeem) => {
        await this.clientEligibility.emit('eligibility', {
          transaction_classify: 'REDEEM',
          trace_custom_code: 'RDM',
          origin: 'redeem',
          program: {
            _id: '6400f68c1ce7c1080676e60f',
            name: 'DCI38',
            desc: 'DCI38',
            start_period: '2023-03-01T15:11:36.106Z',
            end_period: '2023-03-31T16:59:36.000Z',
            point_type: '62ffc1d68a01008799e785cb',
            program_mechanism: '62ffbe08745271e7ba71e867',
            program_owner: '62ffc0fc8a01008799e785bc',
            program_owner_detail: '62ffd9ed1e38fbdeb16f1f53',
            keyword_registration: '',
            point_registration: 0,
            whitelist_counter: false,
            logic: 'Intersection',
            program_time_zone: 'WIB',
            alarm_pic_type: '',
            alarm_pic: ['6341792827fcde0e845cf411'],
            threshold_alarm_expired: 1,
            threshold_alarm_voucher: 70,
            program_notification: [
              {
                template: '63008b6c746163c934b99aa2',
                template_content:
                  'Program [programName] keyword[keywordName] akan berakhir tgl [keywordEndDate] Pkl [keywordEndTime] [timeZone] [programName] [keywordEndDate] [timeZone] [keywordEndDate] [timeZone]',
                via: ['62ffc2988a01008799e785fd', '62ffc2988a01008799e785fe'],
                notif_type: '63030781358dd618b43ef2bd',
              },
              {
                template: '63008b6c746163c934b99aa2',
                template_content:
                  'Quota Program [programName] keyword[keywordName] telah melebih batas [thresholdQuota]  % dgn sisa[remainingQuota] di lokasi [location]. [threshold] [timeZone] [totalbidder] [totalQuota] [trx date] [trxType] [validReplyTime] [voucherCode] [keywordStartDate]',
                via: ['62ffc2988a01008799e785fe', '62ffc2988a01008799e785fd'],
                notif_type: '630307c8358dd618b43ef2cb',
              },
              {
                template: '63008b6c746163c934b99aa2',
                template_content:
                  'Alert. System Error. Detail: [FailedCondition]',
                via: [
                  '62ffc2988a01008799e785fd',
                  '63430cb651c318ac191b1d9b',
                  '62ffc2988a01008799e785fe',
                ],
                notif_type: '6318b4232c84a42231c717af',
              },
              {
                template: '63008b6c746163c934b99aa2',
                template_content:
                  'Anda berhasil terdaftar pd prog [programName].  ',
                via: ['62ffc2988a01008799e785fe'],
                notif_type: '6318b4322c84a42231c717c5',
              },
              {
                template: '63008b6c746163c934b99aa2',
                template_content:
                  'Maaf, Pendaftaran anda pd prog [programName], gagal. Detail: [FailedCondition] ',
                via: ['62ffc2988a01008799e785fe'],
                notif_type: '6318b43b2c84a42231c717db',
              },
              {
                template: '63008b6c746163c934b99aa2',
                template_content:
                  'System busy please try again later [FailedCondition]',
                via: ['62ffc2988a01008799e785fe'],
                notif_type: '632b15a463d18f30ac06f167',
              },
            ],
            program_approval: '62ffbdfe745271e7ba71e858',
            is_draft: false,
            need_review_after_edit: false,
            created_by: {
              _id: '63fea62f01dfb4ebdd29aa17',
              user_name: 'indra',
              __v: 0,
              core_role: 'role-632bd8a4495f57bdeb43fcaf',
              created_at: '2023-03-01T01:11:11.000Z',
              deleted_at: null,
              email: null,
              first_name: 'Indra',
              job_level: 'User',
              job_title: 'Staff Area',
              last_name: 'Medan',
              phone: '0811213123|TH|+66',
              role: '63fea62f01dfb4ebdd29aa15',
              type: 'business',
              updated_at: '2023-03-01T01:11:11.000Z',
              user_id: 'user-63f2fb623f1dbf2c82b3ae1b',
              superior_hq: '633580da37845362144f0eda',
              superior_local: '',
              role_detail: {
                _id: '63fea62f01dfb4ebdd29aa15',
                role_id: 'role-632bd8a4495f57bdeb43fcaf',
                __v: 0,
                authorizes: [],
                desc: '',
                name: 'Staff Area',
              },
              account_location: {
                __v: 0,
                location: '62ffd9ed1e38fbdeb16f1f53',
                location_detail: {
                  code: '1',
                  name: 'HQ',
                  type: '62ffc0fc8a01008799e785bc',
                  __v: 0,
                  data_source: 'LACIMA',
                },
              },
              core_payload: {
                locales: null,
                currencies: null,
                user_profile: {
                  id: 'user-63f2fb623f1dbf2c82b3ae1b',
                  username: 'indra',
                  firstname: 'Indra',
                  lastname: 'Medan',
                  job_title: 'Staff Area',
                  job_level: 'User',
                  identification: {
                    employee_no: '100001',
                  },
                  phone: '0811213123|TH|+66',
                  email: null,
                  image_url: null,
                  status: 'Active',
                  last_access_time: '2023-03-01T15:13:46.772Z',
                  __v: 2,
                  role_id: 'role-632bd8a4495f57bdeb43fcaf',
                },
                authorizes: [
                  {
                    object_code: 'business.config.program',
                    code: 'business.config.program',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.keyword',
                    code: 'business.config.keyword',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.merchant',
                    code: 'business.config.merchant',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.lov',
                    code: 'business.config.lov',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.bank',
                    code: 'business.config.bank',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.bucket',
                    code: 'business.config.bucket',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.channel',
                    code: 'business.config.channel',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.customer_brand',
                    code: 'business.config.customer_brand',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.customer',
                    code: 'business.config.customer',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.location',
                    code: 'business.config.location',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.merchandise',
                    code: 'business.config.merchandise',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.outlet',
                    code: 'business.config.outlet',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.partner',
                    code: 'business.config.partner',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.parnert',
                    code: 'business.config.parnert',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.notification',
                    code: 'business.config.notification',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.pic',
                    code: 'business.config.pic',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.tier',
                    code: 'business.config.tier',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.subscribers.subscriber-classes',
                    code: 'business.subscribers.subscriber-classes',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.subscribers.transactions',
                    code: 'business.subscribers.transactions',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.earning-rules',
                    code: 'business.config.earning-rules',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.rewards',
                    code: 'business.config.rewards',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.admin.users',
                    code: 'business.admin.users',
                    action_codes: ['Read', 'Write'],
                  },
                ],
              },
            },
            deleted_at: null,
            created_at: '2023-03-01T03:14:07.000Z',
            updated_at: '2023-03-01T03:14:07.000Z',
            __v: 0,
          },
          keyword: {
            _id: '6400f6d91ce7c1080676e612',
            reward_catalog_field: [],
            eligibility: {
              name: 'STAMP',
              start_period: '2023-03-01T15:11:36.106Z',
              end_period: '2023-03-31T16:59:36.000Z',
              program_experience: ['63f5771d2db3d763748c5067'],
              keyword_type: '',
              point_type: '',
              poin_value: 'Fixed',
              poin_redeemed: 0,
              channel_validation: false,
              channel_validation_list: [],
              eligibility_locations: true,
              locations: ['62ffd9ed1e38fbdeb16f1f53'],
              program_title_expose: 'DCI38STAMP',
              merchant: '',
              program_id: '6400f68c1ce7c1080676e60f',
              merchandise_keyword: false,
              keyword_schedule: 'Daily',
              program_bersubsidi: false,
              total_budget: 0,
              customer_value: 0,
              multiwhitelist: false,
              multiwhitelist_program: [],
              enable_sms_masking: false,
              sms_masking: '',
              timezone: '',
              for_new_redeemer: false,
              max_mode: '',
              max_redeem_counter: 0,
              segmentation_customer_tier: [],
              segmentation_customer_los_operator: '',
              segmentation_customer_los_max: 0,
              segmentation_customer_los_min: 0,
              segmentation_customer_los: 0,
              segmentation_customer_type: '',
              segmentation_customer_most_redeem: [],
              segmentation_customer_brand: [],
              segmentation_customer_prepaid_registration: false,
              segmentation_customer_kyc_completeness: false,
              segmentation_customer_poin_balance_operator: '',
              segmentation_customer_poin_balance: 0,
              segmentation_customer_poin_balance_max: 0,
              segmentation_customer_poin_balance_min: 0,
              segmentation_customer_preference: '',
              segmentation_customer_arpu_operator: '',
              segmentation_customer_arpu: 0,
              segmentation_customer_arpu_min: 0,
              segmentation_customer_arpu_max: 0,
              segmentation_customer_preferences_bcp: '',
              location_type: '62ffc0fc8a01008799e785bc',
              keyword_shift: [
                {
                  from: '2023-03-01T15:45:43.479Z',
                  to: '2023-03-01T15:45:43.479Z',
                },
              ],
              bcp_app_name: '',
              bcp_app_name_operator: '',
              bcp_app_category: '',
              bcp_app_category_operator: '',
              imei: '',
              imei_operator: '',
            },
            bonus: [
              {
                bonus_type: 'loyalty_poin',
                earning_poin: 0,
                stock_location: [
                  {
                    name: 'HQ',
                    location_id: '62ffd9ed1e38fbdeb16f1f53',
                    stock: 0,
                    adhoc_group: [],
                  },
                ],
              },
            ],
            notification: [
              {
                via: [],
                receiver: [],
                bonus_type_id: '',
                code_identifier: '6319f7e751e92661186160f0',
                start_period: '2023-03-01T15:11:36.106Z',
                end_period: '2023-03-31T16:59:36.000Z',
                notif_type: '',
                notification_content: '',
                keyword_name: 'STAMP',
              },
              {
                via: [],
                receiver: [],
                bonus_type_id: '',
                code_identifier: '6319f7f851e926611861610a',
                start_period: '2023-03-01T15:11:36.106Z',
                end_period: '2023-03-31T16:59:36.000Z',
                notif_type: '',
                notification_content: '',
                keyword_name: 'STAMP',
              },
              {
                via: [],
                receiver: [],
                bonus_type_id: '',
                code_identifier: '6319f81b51e92661186161a9',
                start_period: '2023-03-01T15:11:36.106Z',
                end_period: '2023-03-31T16:59:36.000Z',
                notif_type: '',
                notification_content: '',
                keyword_name: 'STAMP',
              },
              {
                via: [],
                receiver: [],
                bonus_type_id: '',
                code_identifier: '6319f82851e92661186161c3',
                start_period: '2023-03-01T15:11:36.106Z',
                end_period: '2023-03-31T16:59:36.000Z',
                notif_type: '',
                notification_content: '',
                keyword_name: '',
              },
              {
                via: [],
                receiver: [],
                bonus_type_id: '',
                code_identifier: '6372fb31200e05a5df75142d',
                start_period: '2023-03-01T15:11:36.106Z',
                end_period: '2023-03-31T16:59:36.000Z',
                notif_type: '',
                notification_content: '',
                keyword_name: 'STAMP',
              },
            ],
            keyword_approval: '62ffbdd1745271e7ba71e849',
            is_draft: false,
            need_review_after_edit: false,
            created_by: {
              _id: '63fea62f01dfb4ebdd29aa17',
              user_name: 'indra',
              __v: 0,
              core_role: 'role-632bd8a4495f57bdeb43fcaf',
              created_at: '2023-03-01T01:11:11.000Z',
              deleted_at: null,
              email: null,
              first_name: 'Indra',
              job_level: 'User',
              job_title: 'Staff Area',
              last_name: 'Medan',
              phone: '0811213123|TH|+66',
              role: '63fea62f01dfb4ebdd29aa15',
              type: 'business',
              updated_at: '2023-03-01T01:11:11.000Z',
              user_id: 'user-63f2fb623f1dbf2c82b3ae1b',
              superior_hq: '633580da37845362144f0eda',
              superior_local: '',
              role_detail: {
                _id: '63fea62f01dfb4ebdd29aa15',
                role_id: 'role-632bd8a4495f57bdeb43fcaf',
                __v: 0,
                authorizes: [],
                desc: '',
                name: 'Staff Area',
              },
              account_location: {
                __v: 0,
                location: '62ffd9ed1e38fbdeb16f1f53',
                location_detail: {
                  code: '1',
                  name: 'HQ',
                  type: '62ffc0fc8a01008799e785bc',
                  __v: 0,
                  data_source: 'BOTH',
                },
              },
              core_payload: {
                locales: null,
                currencies: null,
                user_profile: {
                  id: 'user-63f2fb623f1dbf2c82b3ae1b',
                  username: 'indra',
                  firstname: 'Indra',
                  lastname: 'Medan',
                  job_title: 'Staff Area',
                  job_level: 'User',
                  identification: {
                    employee_no: '100001',
                  },
                  phone: '0811213123|TH|+66',
                  email: null,
                  image_url: null,
                  status: 'Active',
                  last_access_time: '2023-03-01T15:47:53.720Z',
                  __v: 2,
                  role_id: 'role-632bd8a4495f57bdeb43fcaf',
                },
                authorizes: [
                  {
                    object_code: 'business.config.program',
                    code: 'business.config.program',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.keyword',
                    code: 'business.config.keyword',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.merchant',
                    code: 'business.config.merchant',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.lov',
                    code: 'business.config.lov',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.bank',
                    code: 'business.config.bank',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.bucket',
                    code: 'business.config.bucket',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.channel',
                    code: 'business.config.channel',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.customer_brand',
                    code: 'business.config.customer_brand',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.customer',
                    code: 'business.config.customer',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.location',
                    code: 'business.config.location',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.merchandise',
                    code: 'business.config.merchandise',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.outlet',
                    code: 'business.config.outlet',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.partner',
                    code: 'business.config.partner',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.parnert',
                    code: 'business.config.parnert',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.notification',
                    code: 'business.config.notification',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.pic',
                    code: 'business.config.pic',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.tier',
                    code: 'business.config.tier',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.subscribers.subscriber-classes',
                    code: 'business.subscribers.subscriber-classes',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.subscribers.transactions',
                    code: 'business.subscribers.transactions',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.earning-rules',
                    code: 'business.config.earning-rules',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.config.rewards',
                    code: 'business.config.rewards',
                    action_codes: ['Read', 'Write'],
                  },
                  {
                    object_code: 'business.admin.users',
                    code: 'business.admin.users',
                    action_codes: ['Read', 'Write'],
                  },
                ],
              },
            },
            deleted_at: null,
            created_at: '2023-03-01T03:47:53.000Z',
            updated_at: '2023-03-01T03:47:53.000Z',
            __v: 0,
            hq_approver: '63fea8cd01dfb4ebdd29d0b9',
          },
          customer: {},
          endpoint: '/v1/redeem',
          redeem: redeem,
          tracing_id: trace_id,
          tracing_master_id: trace_id.replace('TRX', 'RDM'),
          incoming: {
            msisdn: `0${msisdn}`,
            keyword: 'STAMP',
            send_notification: true,
          },
          account: {
            _id: '63fea65201dfb4ebdd29ac9a',
            user_name: 'felix',
            __v: 0,
            core_role: 'role-632bd8a4495f57bdeb43fcaf',
            created_at: '2023-03-01T01:11:46.000Z',
            deleted_at: null,
            email: 'theycantrevealus1@gmail.com',
            first_name: 'Mr. Felix',
            job_level: 'User',
            job_title: 'Staff Area',
            last_name: 'Seran',
            phone: '0891234568|TH|+66',
            role: '63fea62f01dfb4ebdd29aa15',
            type: 'business',
            updated_at: '2023-03-01T01:11:46.000Z',
            user_id: 'user-63347d3e4e1348281aab21ab',
            role_detail: {
              _id: '63fea62f01dfb4ebdd29aa15',
              role_id: 'role-632bd8a4495f57bdeb43fcaf',
              __v: 0,
              authorizes: [],
              desc: '',
              name: 'Staff Area',
            },
            account_location: {
              __v: 0,
              location: '62ffd9ed1e38fbdeb16f1f53',
              location_detail: {
                code: '1',
                name: 'HQ',
                type: '62ffc0fc8a01008799e785bc',
                __v: 0,
                data_source: 'BOTH',
              },
            },
            core_payload: {
              locales: null,
              currencies: null,
              user_profile: {
                id: 'user-63347d3e4e1348281aab21ab',
                username: 'felix',
                firstname: 'Mr. Felix',
                lastname: 'Seran',
                job_title: 'Staff Area',
                job_level: 'User',
                identification: {
                  employee_no: '00001001',
                },
                phone: '0891234568|TH|+66',
                email: 'theycantrevealus1@gmail.com',
                image_url: null,
                status: 'Active',
                last_access_time: '2023-03-02T17:17:02.357Z',
                __v: 3,
                role_id: 'role-632bd8a4495f57bdeb43fcaf',
              },
              authorizes: [
                {
                  object_code: 'business.config.program',
                  code: 'business.config.program',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.keyword',
                  code: 'business.config.keyword',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.merchant',
                  code: 'business.config.merchant',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.lov',
                  code: 'business.config.lov',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.bank',
                  code: 'business.config.bank',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.bucket',
                  code: 'business.config.bucket',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.channel',
                  code: 'business.config.channel',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.customer_brand',
                  code: 'business.config.customer_brand',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.customer',
                  code: 'business.config.customer',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.location',
                  code: 'business.config.location',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.merchandise',
                  code: 'business.config.merchandise',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.outlet',
                  code: 'business.config.outlet',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.partner',
                  code: 'business.config.partner',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.parnert',
                  code: 'business.config.parnert',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.notification',
                  code: 'business.config.notification',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.pic',
                  code: 'business.config.pic',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.tier',
                  code: 'business.config.tier',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.subscribers.subscriber-classes',
                  code: 'business.subscribers.subscriber-classes',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.subscribers.transactions',
                  code: 'business.subscribers.transactions',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.earning-rules',
                  code: 'business.config.earning-rules',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.config.rewards',
                  code: 'business.config.rewards',
                  action_codes: ['Read', 'Write'],
                },
                {
                  object_code: 'business.admin.users',
                  code: 'business.admin.users',
                  action_codes: ['Read', 'Write'],
                },
              ],
            },
          },
          submit_time: '2023-03-05T15:11:36.106Z',
          token: `${job.data.token}`,
          bonus_type: 'loyalty_poin',
          is_stock_deducted: false,
          is_whitelist_deducted: false,
          retry: {
            deduct: {
              counter: 0,
              errors: [],
            },
            refund: {
              counter: 0,
              errors: [],
            },
            inject_point: {
              counter: 0,
              errors: [],
            },
            donation: {
              counter: 0,
              errors: [],
            },
            coupon: {
              counter: 0,
              errors: [],
            },
            outbound: {
              counter: 0,
              errors: [],
            },
          },
          rule: {
            fixed_multiple: {
              counter: 0,
              counter_fail: 0,
              counter_success: 0,
              message : [],
              status : [],
              transactions : [],
            },
          },
          payload: {
            deduct: {
              type: 'reward',
              channel: 'Application',
              reward_item_id: 'rwditm-621edf16bf9fa6033d92bfeb',
              amount: 0,
              remark: 'DCI38STAMP',
              member_id: null,
              realm_id: this.configService.get<string>('core-backend.realm.id'),
              branch_id: this.configService.get<string>(
                'core-backend.branch.id',
              ),
              merchant_id: this.configService.get<string>(
                'core-backend.merchant.id',
              ),
              __v: 0,
            },
            telco_postpaid: null,
            telco_prepaid: null,
            link_aja_bonus: null,
            link_aja_main: null,
            ngrs: null,
            coupon: null,
            donation: null,
            voucher: null,
            direct_redeem: null,
            void: null,
            inject_point: {
              type: 'reward',
              channel: 'Application',
              transaction_no: trace_id.replace('TRX', 'RDM'),
              remark: 'DCI38STAMP',
              reward_item_id: 'rwditm-621edf16bf9fa6033d92bfeb',
              reward_instance_id: 'rwdins-621edf16bf9fa6033d92bfeb',
              amount: 0,
              member_id: null,
              local_id: null,
              realm_id: this.configService.get<string>('core-backend.realm.id'),
              branch_id: this.configService.get<string>(
                'core-backend.branch.id',
              ),
              merchant_id: this.configService.get<string>(
                'core-backend.merchant.id',
              ),
              __v: 0,
            },
            mbp: null,
          },
        });
      });
    }
  }
}
