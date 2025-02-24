import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Logger } from 'winston';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  FMC_reformatMsisdnCore,
  msisdnCombineFormatted,
} from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { LovService } from '@/lov/services/lov.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';

// import { MaxModeConstant } from '../../gateway/src/constants/constant';
import { WINSTON_MODULE_PROVIDER } from '../../utils/logger/constants';
import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { IAccount } from '../../utils/logger/transport';

@Injectable()
export class KafkaService {
  private customerService: CustomerService;
  private lovService: LovService;
  private eligibilityService: EligibilityService;
  private notificationContentService: NotificationContentService;
  private redeemService: RedeemService;
  private applicationService: ApplicationService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;
  private payload: any;
  private notEligible: boolean;
  // private is_indihome: boolean;

  // private logger: Logger = new Logger(KafkaService.name);

  constructor(
    lovService: LovService,
    // configService: ConfigService,
    customerService: CustomerService,
    httpService: HttpService,
    eligibilityService: EligibilityService,
    notificationContentService: NotificationContentService,
    applicationService: ApplicationService,
    redeemService: RedeemService,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.lovService = lovService;
    this.eligibilityService = eligibilityService;
    this.notificationContentService = notificationContentService;
    this.applicationService = applicationService;
    this.redeemService = redeemService;

    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.customerService = customerService;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async eligibilityCheck(
    _payload: any,
    start: any,
    loggerObject: any,
  ): Promise<any> {
    const startTime = new Date();
    try {
      // <-- check indihome -->
      // const indihome_name = await this.applicationService.getConfig('INDIHOME');
      // this.is_indihome = _payload?.incoming?.identifier_type?.toUpperCase() === indihome_name
      // <-- end check indihome -->

      const noConfig = await this.applicationService.getConfig(
        'PROGRAM_NO_RULE_MECHANISM',
      );
      const isNoRule =
        _payload.program.program_mechanism.toString() === noConfig.toString();
      console.log(_payload.program.program_mechanism.toString());
      console.log(noConfig.toString());
      console.log(isNoRule);

      this.payload = _payload;
      this.payload.origin = isNoRule
        ? `${this.payload?.origin}.norule`
        : `${this.payload?.origin}.eligibility`;
      let programCheck;
      let keywordCheck;

      const dataCheck = await this.eligibilityService.setParamsAndCheck(
        this.payload.incoming.msisdn,
        this.payload.keyword.eligibility.name,
        this.payload.program.name,
        this.payload.token,
        this.payload,
        loggerObject,
      );

      // console.log(dataCheck, 'payload 1');
      await this.checkEligible(dataCheck);
      await this.loggerEligibility(
        loggerObject,
        dataCheck,
        `payload 1 check msisdn , keyword, program and DSP if available ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      console.log('agung berapa');
      if (this.notEligible) return this.payload;

      // program check by multi bonus
      if (!this.payload.is_keyword_registration) {
        programCheck = await this.eligibilityService.checkByMultiBonus(
          this.payload,
        );
        await this.checkEligible(programCheck);
        await this.loggerEligibility(
          loggerObject,
          programCheck,
          `payload checkByMultiBonus ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;
      }

      // program check by approve status
      programCheck =
        await this.eligibilityService.checkByProgramApproveStatus();
      await this.checkEligible(programCheck);
      // console.log(programCheck, 'payload 2');
      await this.loggerEligibility(
        loggerObject,
        programCheck,
        `payload 2 checkByProgramApproveStatus ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      if (this.notEligible) return this.payload;

      // program check by status stop
      programCheck = await this.eligibilityService.checkByProgramStopStatus();
      await this.checkEligible(programCheck);
      // console.log(programCheck, 'payload stop 3');
      await this.loggerEligibility(
        loggerObject,
        programCheck,
        `payload 3 checkByProgramStopStatus ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      if (this.notEligible) return this.payload;

      // program check start and end period
      programCheck =
        await this.eligibilityService.checkProgramByStartAndEndPeriod(
          this.payload.submit_time,
        );
      await this.checkEligible(programCheck);
      // console.log(programCheck, 'payload 4');
      await this.loggerEligibility(
        loggerObject,
        programCheck,
        `payload 4 checkProgramByStartAndEndPeriod ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      if (this.notEligible) return this.payload;

      // keyword check Approve status stop
      keywordCheck =
        await this.eligibilityService.checkByKeywordApproveStatusStop();
      await this.checkEligible(keywordCheck);
      await this.loggerEligibility(
        loggerObject,
        keywordCheck,
        `payload 5 checkByKeywordApproveStatusStop ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      // console.log(keywordCheck, 'payload checkByKeywordApproveStatusStop 6');
      if (this.notEligible) return this.payload;

      // keyword check keyword approve
      keywordCheck =
        await this.eligibilityService.checkByKeywordApproveStatus();
      await this.checkEligible(keywordCheck);
      // console.log(keywordCheck, 'payload 7');
      await this.loggerEligibility(
        loggerObject,
        keywordCheck,
        `payload 6 checkByKeywordApproveStatus ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      if (this.notEligible) return this.payload;

      // keyword check keyword start and end period
      keywordCheck =
        await this.eligibilityService.checkByKeywordStartAndEndPeriod(
          this.payload.submit_time,
        );
      await this.checkEligible(keywordCheck);
      // console.log(keywordCheck, 'payload 8');
      await this.loggerEligibility(
        loggerObject,
        keywordCheck,
        `payload 7 checkByKeywordStartAndEndPeriod ${
          this.notEligible ? 'Failed' : 'Success'
        }`,
        start,
      );
      if (this.notEligible) return this.payload;

      if (
        this.payload.is_keyword_registration ||
        this.payload.program.keyword_registration
      ) {
        // check if user has registered the keyword
        keywordCheck =
          await this.eligibilityService.checkKeywordAlreadyRegistered();
        await this.checkEligible(keywordCheck);
        console.log(keywordCheck, 'payload 10 regist');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 8 checkKeywordAlreadyRegistered ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;
      }

      if (!isNoRule) {
        // console.log(dataCheck, 'payload 3');

        // check schedule of keyword
        programCheck = await this.eligibilityService.checkByKeywordSchedule(
          this.payload.submit_time,
        );
        await this.checkEligible(programCheck);
        // console.log(programCheck, 'payload schedule 9');
        await this.loggerEligibility(
          loggerObject,
          programCheck,
          `payload 9 checkByKeywordSchedule ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // program check in blacklist & whitelist
        programCheck = await this.eligibilityService.checkProgramWBList();
        await this.checkEligible(programCheck);
        // console.log(programCheck, 'payload 10');
        await this.loggerEligibility(
          loggerObject,
          programCheck,
          `payload 10 checkProgramWBList ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // // program check in whitelist
        // programCheck = await this.eligibilityService.checkProgramWhitelist();
        // await this.checkEligible(programCheck);
        // console.log(programCheck, 'payload 6');
        // if (this.notEligible) return this.payload;
        //
        // // program check in blacklist
        // programCheck = await this.eligibilityService.checkProgramBlacklist();
        // await this.checkEligible(programCheck);
        // console.log(programCheck, 'payload 7');
        // if (this.notEligible) return this.payload;

        // program check keyword registration
        // programCheck = await this.eligibilityService.checkByRegistration();
        // await this.checkEligible(programCheck);
        // // console.log(programCheck, 'payload 11');
        // await this.loggerEligibility(
        //   this.payload,
        //   programCheck,
        //   'payload 11',
        //   start,
        // );
        // if (this.notEligible) return this.payload;
        // if (this.payload.is_keyword_registration) {
        //   // check if user has registered the keyword
        //   keywordCheck =
        //     await this.eligibilityService.checkKeywordAlreadyRegistered();
        //   await this.checkEligible(keywordCheck);
        //   console.log(keywordCheck, 'payload checkKeywordAlreadyRegistered');
        //   await this.loggerEligibility(
        //     this.payload,
        //     keywordCheck,
        //     'payload 10',
        //     start,
        //   );
        //   if (this.notEligible) return this.payload;
        // }

        //todo, check by waktu program / program time harian

        // keyword check by channel
        keywordCheck = await this.eligibilityService.checkByChannel(
          this.payload.incoming.channel_id,
        );
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 12');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 11 checkByChannel ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by keyword point type
        const keywordCheck1 = this.payload?.payload?.tsel_id?.wallet_sibling
          ? await this.getBalanceTselId()
          : await this.eligibilityService.checkByPoinTypeAndValue(
              this.payload.token,
            );
        await this.checkEligible(keywordCheck1);
        // console.log(keywordCheck1, 'payload 14');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck1,
          `payload 12 checkByPoinTypeAndValue ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by customer tier
        keywordCheck = await this.eligibilityService.checkByCustomerTier(
          this.payload,
        );
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 15');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 13 checkByCustomerTier ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by customer los
        keywordCheck = await this.eligibilityService.checkByCustomerLos();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 16');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 14 checkByCustomerLos ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by customer type skipp
        keywordCheck = await this.eligibilityService.checkByCustomerType();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 17');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 15 checkByCustomerType ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by brand
        keywordCheck = await this.eligibilityService.checkByCustomerBrand();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 18');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 16 checkByCustomerBrand ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by customer employee
        keywordCheck = await this.eligibilityService.checkByCustomerEmployee();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 19');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 17 checkByCustomerEmployee ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by arpu
        keywordCheck = await this.eligibilityService.checkByCustomerArpu();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 20');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 18 checkByCustomerArpu ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by customer app category and app name
        keywordCheck = await this.eligibilityService.checkByBcpApp();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 21');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 19 checkByBcpApp ${this.notEligible ? 'Failed' : 'Success'}`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by compare imei config keyword and customer imei
        keywordCheck = await this.eligibilityService.checkByMei();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload imei 22');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 20 checkByMei ${this.notEligible ? 'Failed' : 'Success'}`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by keyword segmentation
        keywordCheck = await this.eligibilityService.checkBySegmentation();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 23');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 21 checkBySegmentation ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        console.log(this.payload?.origin, 'eligible');

        const keyword_donation = _payload.keyword.bonus.filter(
          (e) => e.bonus_type == 'donation',
        );
        if (keyword_donation.length > 0) {
          keywordCheck = await this.eligibilityService.checkByDonation(
            _payload.keyword._id,
            _payload.keyword.eligibility.name,
            keyword_donation,
            _payload.payload.donation,
          );

          await this.checkEligible(
            keywordCheck['result'] ? keywordCheck['result'] : keywordCheck,
          );
          // console.log(keywordCheck, 'payload 24');
          await this.loggerEligibility(
            loggerObject,
            keywordCheck,
            `payload 22 checkByDonation ${
              this.notEligible ? 'Failed' : 'Success'
            }`,
            start,
          );
          if (this.notEligible) return this.payload;

          if (keywordCheck['incoming']) {
            this.payload.donationCounter = keywordCheck['incoming'];
          }
        }

        // Validation outbound bonus if msisdn is indihome number
        // const outbound = _payload.keyword.bonus.filte(
        //   (e) =>
        //     e.bonus_type == 'telco_prepaid' ||
        //     e.bonus_type == 'telco_postpaid' ||
        //     e.bonus_type == 'ngrs' ||
        //     e.bonus_type == 'linkaja' ||
        //     e.bonus_type == 'linkaja_main' ||
        //     e.bonus_type == 'linkaja_bonus' ||
        //     e.bonus_type == 'linkaja_voucher',
        // );
        // if (this.is_indihome && outbound.includes(_payload.keyword.bonus)) {
        //   const payload = {
        //     eligible: false,
        //     reason: `The Keyword cannot redeem with bonus ${_payload.keyword.bonus} because the keyword is outbound`,
        //     notification_group: NotificationTemplateConfig.IHOUTBOUND_REDEEM_FAILED
        //   }
        //   await this.checkEligible(payload);
        //   await this.loggerEligibility(
        //     loggerObject,
        //     payload,
        //     `payload validate bonus outbound ${
        //       this.notEligible ? 'Failed' : 'Success'
        //     }`,
        //     start,
        //   );
        //   if (this.notEligible) return this.payload;
        // }

        // keyword check by donation
        // todo: to be check
        // const keyword_donation = _payload.keyword.bonus.filter(
        //   (e) => e.bonus_type == 'donation',
        // );
        // if (keyword_donation.length > 0) {
        //   keywordCheck = await this.eligibilityService.checkByDonation(
        //     _payload.keyword.eligibility.name,
        //     keyword_donation,
        //     _payload.payload.donation,
        //   );
        //   await this.checkEligible(keywordCheck);
        //   console.log(keywordCheck, 'payload 22');
        //   if (this.notEligible) return this.payload;
        //   console.log(this.payload.origin, 'donation');
        // }

        // keyword check by location DSP
        // keywordCheck = await this.eligibilityService.checkByLocationDSP();
        // keywordCheck = await this.eligibilityService.checkByLocationDSP2(
        //   this.payload.incoming.msisdn,
        // );
        // console.log('payload 26 DSP', keywordCheck);
        // await this.checkEligible(keywordCheck);
        // this.logger.log(programCheck);
        // await this.loggerEligibility(
        //   this.payload,
        //   keywordCheck,
        //   'payload 26',
        //   start,
        // );
        // await this.loggerEligibility(
        //   this.payload,
        //   keywordCheck,
        //   'payload DSP 26',
        //   start,
        // );
        // if (this.notEligible) return this.payload;

        // keyword check by location
        keywordCheck = await this.eligibilityService.checkByLocation();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 25');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 23 checkByLocation ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by new redeemer
        keywordCheck = await this.eligibilityService.checkByNewRedeemer();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 28');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 24 checkByNewRedeemer ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by prepaid regist
        keywordCheck = await this.eligibilityService.checkPrepaidRegist();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 29');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 25 checkPrepaidRegist ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        // if (this.payload.is_keyword_registration) {
        //   // check if user has registered the keyword
        //   keywordCheck =
        //     await this.eligibilityService.checkKeywordAlreadyRegistered();
        //   await this.checkEligible(keywordCheck);
        //   console.log(keywordCheck, 'payload checkKeywordAlreadyRegistered');
        //   if (this.notEligible) return this.payload;
        // }

        // keyword check by max redeem
        if (
          this.payload.keyword.eligibility.max_mode &&
          this.payload.keyword.eligibility.max_mode !== ''
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const programId = this.payload.keyword.eligibility.program_id;
          const eligibilityName = this.payload.keyword.eligibility.name;
          const maxMode = this.payload.keyword.eligibility.max_mode;
          const maxRedeemCounter =
            this.payload.keyword.eligibility.max_redeem_counter;
          const from = this.payload.keyword.eligibility.start_period;
          const to = this.payload.keyword.eligibility.end_period;
          const keyword_shift = this.payload.keyword.eligibility.keyword_shift;
          const program_time_zone = this.payload.program.program_time_zone;
          const cust_time_zone = this.payload.customer.timezone ?? 'WIB';
          const submitTime = this.payload.submit_time;

          const msisdn = this.payload.incoming.msisdn;
          const maxRedeemHandler = await this.redeemService.maxRedeemHandler(
            programId,
            eligibilityName,
            maxMode,
            maxRedeemCounter,
            new Date(),
            from,
            to,
            msisdn,
            keyword_shift,
            program_time_zone,
            cust_time_zone,
            submitTime,
          );
          this.notEligible = maxRedeemHandler['eligible'];
          keywordCheck = {
            eligible: maxRedeemHandler['eligible'],
            reason: maxRedeemHandler['reason']
              ? maxRedeemHandler['reason']
              : '',
            notification_group: !maxRedeemHandler['eligible']
              ? NotificationTemplateConfig.REDEEM_FAILED_MAXREDEEM
              : '',
          };
          await this.checkEligible(keywordCheck);
          // console.log(keywordCheck, 'payload 13');
          await this.loggerEligibility(
            loggerObject,
            keywordCheck,
            `payload 26 maxRedeemHandler ${
              this.notEligible ? 'Failed' : 'Success'
            }`,
            start,
          );
          this.payload.maxRedeemer = maxRedeemHandler['payload'];
          if (this.notEligible) return this.payload;
        }

        // keyword check by flashsale
        if (this.payload.keyword?.eligibility?.flashsale?.status) {
          keywordCheck = await this.eligibilityService.checkFlashSale(
            this.payload.submit_time,
          );
          await this.checkEligible(keywordCheck);
          // console.log(keywordCheck, 'payload 29');
          await this.loggerEligibility(
            loggerObject,
            keywordCheck,
            `payload 29 checkFlashSale ${
              this.notEligible ? 'Failed' : 'Success'
            }`,
            start,
          );
          if (this.notEligible) return this.payload;
        }

        // keyword check by stock
        keywordCheck = await this.eligibilityService.checkByStock();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 27');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 27 checkByStock ${this.notEligible ? 'Failed' : 'Success'}`,
          start,
        );
        if (this.notEligible) return this.payload;

        // keyword check by Type Aucation
        keywordCheck = await this.eligibilityService.checkByBonusTypeAucation();
        await this.checkEligible(keywordCheck);
        // console.log(keywordCheck, 'payload 27');
        await this.loggerEligibility(
          loggerObject,
          keywordCheck,
          `payload 28 checkByBonusTypeAucation ${
            this.notEligible ? 'Failed' : 'Success'
          }`,
          start,
        );
        if (this.notEligible) return this.payload;

        this.payload.origin = `${this.payload?.origin}_success`;
        // console.log(this.payload.origin, 'origin');
      }

      // if (isNoRule) {
      //   this.payload.origin = `${this.payload.origin}_success`;
      // }

      const endTime = new Date();
      console.log(
        `NFT_KafkaService.eligibilityCheck = ${
          endTime.getTime() - startTime.getTime()
        } ms`,
      );
      return this.payload;
    } catch (error) {
      await this.loggerEligibility(loggerObject, error, error, start, true);
    }
  }

  async checkEligible(checkParams: any, newOrigin = 'fail') {
    this.notEligible = false;
    if (!checkParams.eligible) {
      // set origin
      this.payload.origin = `${this.payload?.origin}_${newOrigin}`;
      // failed condition on eligibility
      this.payload.reason = checkParams.reason;

      // set notification template
      this.payload.notification =
        await this.notificationContentService.getNotificationTemplate(
          checkParams.notification_group,
          this.payload,
        );

      this.notEligible = true;

      // emit to notification

      return {
        notification_group: checkParams.notification_group,
        ...this.payload,
      };
      // this.notificationClient.emit('notification', this.payload);
    }
  }

  async loggerEligibility(
    payload: any,
    dataCheck: any,
    message: any,
    start: any,
    isError: any = false,
  ) {
    // handle error on service
    if (isError) {
      dataCheck = {
        ...dataCheck,
        result: {
          message: message?.message,
          stack: message?.stack,
        },
      };
    }
    console.log('agung dataCheck : ', dataCheck);
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    console.log('agung taken time : ', takenTime);
    await this.exceptionHandler.handle({
      level: this.notEligible ? 'warn' : isError ? 'error' : 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: this.notEligible
        ? HttpStatus.BAD_REQUEST
        : isError
        ? HttpStatus.INTERNAL_SERVER_ERROR
        : HttpStatus.OK,
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: this.notEligible
          ? HttpStatus.BAD_REQUEST
          : isError
          ? HttpStatus.INTERNAL_SERVER_ERROR
          : HttpStatus.OK,
        method: 'kafka',
        url: 'eligibility',
        service: 'ELIGIBILITY',
        step: isError ? 'Error Catch Eligibility' : message,
        param: payload,
        taken_time: takenTime,
        result: {
          statusCode: this.notEligible ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
          level: this.notEligible ? 'error' : 'verbose',
          message: this.notEligible ? dataCheck?.reason : '',
          trace: payload.tracing_id,
          msisdn: payload.incoming.msisdn,
          user_id: new IAccount(payload.account),
          ...dataCheck,
        },
      } satisfies LoggingData,
    });
  }

  async getBalanceTselId() {
    console.log(' === multi deduct checking ===');
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    const payload = this.payload;
    const deductPayload = payload.payload.deduct;
    deductPayload.transaction_no = payload?.tracing_id;
    const token = payload.token;
    const total_redeem = payload?.incoming?.total_redeem;
    const poin_value = payload?.keyword?.eligibility?.poin_value;
    const point_keyword = payload?.keyword?.eligibility?.poin_redeemed;
    // let poin_redeemed = 0;
    // if (poin_value === 'Fixed Multiple') {
    //   poin_redeemed = total_redeem ? total_redeem * point_keyword : point_keyword;
    // } else {
    //   poin_redeemed = poin_value === 'Flexible' && total_redeem ? total_redeem : point_keyword;
    // }
    const poin_redeemed = poin_value === 'Flexible' && total_redeem ? total_redeem : point_keyword;
    const wallet_sibling = payload?.payload?.tsel_id?.wallet_sibling;

    // TODO enhuncement perubahan get wallet siblings (September 2024)
    const totalBalance = wallet_sibling.reduce((a, b) => a + b.balance, 0);

    this.payload.payload.tsel_id.total_point_deduct = -poin_redeemed;
    if (totalBalance >= poin_redeemed) {
      const memberBalanceSort = wallet_sibling.sort((a, b) =>
        a.balance > b.balance ? -1 : 1,
      );
      this.payload.payload.tsel_id.member_balance = memberBalanceSort;
      const member_balance_tobe_deduct = [];
      let point_needed = poin_redeemed;
      memberBalanceSort.map((val) => {
        if (point_needed <= 0) {
          return;
        }
        val.point_deduct =
          point_needed > val.balance ? val.balance : point_needed;
        member_balance_tobe_deduct.push(val);
        point_needed -= val.balance;
      });
      this.payload.payload.tsel_id.member_balance_tobe_deduct =
        member_balance_tobe_deduct;
      this.payload.payload.tsel_id.deduct_original = deductPayload;
    } else {
      console.log('EXPECT = ', 'Point balance not enough');
      result.eligible = false;
      result.reason = `Point balance not enough, current balance ${totalBalance}, poin redeemed ${poin_redeemed}`;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_INSUFFICIENT_BALANCE;
      console.log('==== POINT BALANCE CLOSE ====');
    }
    console.log(' === end multi deduct checking ===');
    return result;
    // End Enhancement
  }
}
