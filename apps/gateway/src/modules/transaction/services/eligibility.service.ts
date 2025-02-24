import {
  AuctionBidder,
  AuctionBidderDocument,
} from '@auction/models/auction_bidder.model';
import { CallApiConfig } from '@configs/call-api.config';
import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import {
  CACHE_MANAGER,
  CacheStore,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount } from '@utils/logger/transport';
import { LoggingData } from '@utils/logger/transport';
import { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { isJson } from '@/application/utils/JSON/json';
import {
  allowedIndihomeNumber,
  allowedMSISDN,
  coreValidationMaxMinLength,
  formatIndihomeNumberCore,
  formatMsisdnCore,
  formatMsisdnToID,
} from '@/application/utils/Msisdn/formatter';
import { getProductID } from '@/application/utils/Product/product';
import { CustomerMemberDto } from '@/customer/dto/customer.member.dto';
import { CustomerService } from '@/customer/services/customer.service';
import { EsbProfileService } from '@/esb/services/esb.profile.service';
import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import { LocationService } from '@/location/services/location.service';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantDocument } from '@/merchant/models/merchant.model';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { StockService } from '@/stock/services/stock.service';
import { InjectPoint } from '@/transaction/models/point/inject.point.model';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';
import { DonationService } from '@/transaction/services/donation/donation.service';
import { PointFmcService } from '@/transaction/services/point/point.fmc.service';
import { WhitelistService } from '@/transaction/services/whitelist/whitelist.service';

const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');
const moment = require('moment-timezone');

@Injectable()
export class EligibilityService {
  private token: string;
  private customerFromCore: any;
  private msisdn: string;
  private keyword?: any;
  private keywordProfile?: KeywordEligibility;
  private keywordName?: string;
  private keywordProfileData?: any;
  private program?: any;
  private programName?: string;
  private payload: any;
  private url: string;

  private merchant: string;
  private realm: string;
  private branch: string;
  private raw_core: string;
  private raw_port: number;
  private url_dsp!: string;
  private indihome: string;
  private is_indihome: boolean;
  dspRes: any;
  startTime: Date;
  loggerObject: any;
  programProfileData: any;
  programApprove: any;
  keywordApprove: any;
  redeemRes: any;

  constructor(
    @InjectModel(AuctionBidder.name)
    private bidderModel: Model<AuctionBidderDocument>,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(CallApiConfigService)
    private readonly callApiConfigService: CallApiConfigService,

    @Inject(CustomerService)
    private readonly customerService: CustomerService,

    @Inject(ProgramServiceV2)
    private readonly programService: ProgramServiceV2,

    @Inject(KeywordService)
    private readonly keywordService: KeywordService,

    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,

    @Inject(LovService)
    private readonly lovService: LovService,

    @Inject(LocationService)
    private readonly locationService: LocationService,

    @Inject(DonationService)
    private readonly donationService: DonationService,

    @Inject(HttpService)
    private readonly httpService: HttpService,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(StockService)
    private readonly stockService: StockService,
    @Inject(EsbProfileService)
    private readonly esbProfileService: EsbProfileService,

    // @Inject(TransactionVoucherService)
    // private readonly transactionVoucherService: TransactionVoucherService,

    @Inject(WhitelistService)
    private readonly whitelistService: WhitelistService,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(Merchant.name)
    private merchantModel: Model<MerchantDocument>,
    @Inject(PointFmcService) private readonly pointService: PointFmcService,
    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,
  ) {
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.url_dsp = `${configService.get<string>('esb-backend.api.url_dsp')}`;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
  }

  /**
   * IMPORTANT! Call this function first if using this class
   * This function is for check availability of customer (by msisdn), keyword, and program
   * @param msisdn
   * @param keyword
   * @param program
   * @param token
   */
  async setParamsAndCheck(
    msisdn = '',
    keyword?: string,
    program?: string,
    token = '',
    payload: any = {},
    loggerObject: any = {},
  ): Promise<any> {
    this.loggerObject = loggerObject;
    this.startTime = new Date();
    this.msisdn = msisdn;
    this.keywordName = keyword;
    this.programName = program;
    this.token = token;
    this.payload = payload;

    // <-- check indihome -->
    this.indihome = await this.applicationService.getConfig('INDIHOME');
    this.is_indihome =
      payload?.incoming?.identifier_type?.toUpperCase() === this.indihome;
    // <-- end check indihome -->

    if (this.payload?.is_keyword_registration) {
      this.keywordProfileData = this.payload.keyword;
    } else {
      this.keywordProfileData = await this.keywordService.getkeywordProfile(
        this.keywordName,
      );
    }
    this.programProfileData = await this.programService.getProgramByNewName(
      this.programName,
    );
    this.programApprove = await this.applicationService.getConfig(
      'DEFAULT_STATUS_PROGRAM_APPROVE_HQ',
    );

    this.keywordApprove = await this.applicationService.getConfig(
      'DEFAULT_STATUS_KEYWORD_APPROVE_HQ',
    );

    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (this.msisdn != '') {
      const validateMsisdn: boolean = this.is_indihome
        ? allowedIndihomeNumber(this.msisdn)
        : allowedMSISDN(this.msisdn);
      if (validateMsisdn) {
        if (!this.is_indihome) {
          function toLowerCaseKeys(obj) {
            return Object.keys(obj).reduce((acc, key) => {
              acc[key.toLowerCase()] = obj[key];
              return acc;
            }, {});
          }

          this.dspRes = await this.checkByLocationDSP(
            this.msisdn,
            this.payload.tracing_id,
            this.payload.incoming.channel_id,
          );
          if (this.dspRes.payload) {
            this.dspRes.payload = toLowerCaseKeys(this.dspRes.payload);
          }
        }

        const reformatMsisdn = this.is_indihome
          ? formatIndihomeNumberCore(this.msisdn)
          : formatMsisdnCore(this.msisdn);

        //check to core if exist, if not exist, create new
        await this.customerService
          .getCoreMemberByMsisdn(
            reformatMsisdn,
            this.token,
            this.merchant,
            false, // TANAKA : NO CACHE
          )
          .then(async (checkCustomer) => {
            if (checkCustomer === null || checkCustomer === undefined) {
              if (coreValidationMaxMinLength(reformatMsisdn)) {
                const customerData = new CustomerMemberDto();

                customerData.locale = 'en-US';
                customerData.channel = 'Application';
                customerData.firstname = `AutoGeneratedMSISDN`;
                customerData.lastname = 'X';
                customerData.nickname = 'X';
                customerData.gender = 'Other';
                customerData.phone = `${reformatMsisdn}|ID|+62`;
                customerData.email = 'anonymous@xyz.com';
                customerData.birthdate = '1990-12-31';
                customerData.status = 'Active';
                customerData.realm_id = this.realm;
                customerData.branch_id = this.branch;
                customerData.merchant_id = this.merchant;
                if (this.is_indihome) {
                  customerData.brand = this.indihome;
                }

                const createCustomer = await this.customerService.memberAdd(
                  customerData,
                  this.token,
                  {
                    msisdn: reformatMsisdn,
                    last_redeemed_date: '',
                    loyalty_tier: '',
                  },
                );

                if (createCustomer.status != HttpStatus.OK) {
                  result.reason = createCustomer.message;
                }

                this.msisdn = reformatMsisdn;
                this.payload.customer = {
                  msisdn: reformatMsisdn,
                  last_redeemed_date: '',
                  loyalty_tier: '',
                };

                this.customerFromCore = createCustomer;

                // Set member_id to deduct
                if (this.customerFromCore['payload']['core_id']) {
                  this.payload.payload.deduct.member_id =
                    this.customerFromCore['payload']['core_id'];
                }
                if (this.dspRes?.eligible) {
                  this.payload.customer.area = this.dspRes['payload']['area']
                    ? this.dspRes['payload']['area']
                    : this.customerFromCore.area_sales;
                  if (this.dspRes['payload']['area']) {
                    this.customerFromCore.area_sales =
                      this.dspRes['payload']['area'];
                  }

                  this.payload.customer.region = this.dspRes['payload'][
                    'regional'
                  ]
                    ? this.dspRes['payload']['regional']
                    : this.customerFromCore.region_sales;
                  if (this.dspRes['payload']['regional']) {
                    this.customerFromCore.region_sales =
                      this.dspRes['payload']['regional'];
                  }

                  this.payload.customer.city = this.dspRes['payload'][
                    'kabupaten'
                  ]
                    ? this.dspRes['payload']['kabupaten']
                    : this.customerFromCore.kabupaten;
                  if (this.dspRes['payload']['kabupaten']) {
                    this.customerFromCore.kabupaten =
                      this.dspRes['payload']['kabupaten'];
                  }
                } else {
                  this.payload.customer.area = this.customerFromCore.area_sales;
                  this.payload.customer.region =
                    this.customerFromCore.region_sales;
                  this.payload.customer.city = this.customerFromCore.kabupaten;
                }

                // Set customer location id
                const customer_location = await this.getCustomerLocation(
                  payload,
                );
                this.payload.customer.location_id =
                  customer_location?.customer_location_id;
                this.payload.keyword_location_id =
                  customer_location?.keyword_location_id;
                this.payload.keyword_location_type =
                  customer_location?.keyword_location_type;

                // TODO : Must replace current add parameter with checked form on eligi check
                this.customerFromCore = await this.customerService
                  .getCoreMemberByMsisdn(
                    reformatMsisdn,
                    this.token,
                    this.merchant,
                    false, // TANAKA : NO CACHE
                  )
                  .then(async (checkCustomer) => {
                    createCustomer.payload = {
                      ...createCustomer.payload._doc,
                      ...checkCustomer[0],
                    };

                    // Point repreparation
                    const keyword = this.payload.keyword;
                    const totalPoin = this.payload.keyword.bonus.filter(
                      (e) => e.bonus_type == 'loyalty_poin',
                    )[0];

                    const isBonusPoint = keyword.bonus.some((item) => {
                      return item.bonus_type.toString() == 'loyalty_poin';
                    });

                    if (isBonusPoint) {
                      const pointPayload = {
                        locale: this.payload.incoming.locale,
                        total_point: totalPoin?.earning_poin
                          ? totalPoin?.earning_poin
                          : 0,
                        msisdn: payload['customer']?.msisdn
                          ? payload['customer']?.msisdn
                          : formatMsisdnToID(payload['incoming']?.msisdn),
                        keyword: payload['keyword'].eligibility.name,
                      };

                      this.payload.payload = {
                        ...this.payload.payload,
                        inject_point: await this.pointService
                          .point_inject(
                            <InjectPoint>pointPayload,
                            this.payload.account,
                            token,
                            false,
                          )
                          .then((pointResult) => {
                            return pointResult.payload.core;
                          }),
                      };
                    }

                    // Coupon repreparation
                    const isBonusCoupon = keyword.bonus.some((item) => {
                      return item.bonus_type.toString() == 'lucky_draw';
                    });

                    if (isBonusCoupon) {
                      const merchant = keyword?.eligibility?.merchant
                        ? await this.merchantModel.findById(
                            keyword?.eligibility?.merchant,
                          )
                        : null;

                      this.payload.payload = {
                        ...this.payload.payload,
                        coupon: {
                          locale: 'en-US',
                          type: 'Coupon',
                          transaction_no: payload['trace_id'],
                          prefix: `${this.configService.get<string>(
                            'core-backend.coupon_prefix.id',
                          )}`
                            ? `${this.configService.get<string>(
                                'core-backend.coupon_prefix.id',
                              )}`
                            : 'CP',
                          owner_phone: `${payload['customer'].msisdn}|ID|+62`,
                          owner_id: payload['customer'].core_id,
                          owner_name: payload['customer'].msisdn,
                          product_name: payload['keyword'].eligibility.name,
                          remark: payload['keyword'].eligibility.name,
                          merchant_name: merchant?.company_name
                            ? merchant?.company_name
                            : 'SL',
                          expiry: {
                            expire_type: 'endof',
                            expire_endof: {
                              value: 12,
                              unit: 'month',
                            },
                          },
                          product_id: `${this.configService.get<string>(
                            'core-backend.coupon_product.id',
                          )}`,
                          realm_id: this.realm,
                          branch_id: this.branch,
                          merchant_id: this.merchant,
                        },
                      };
                    }

                    return createCustomer;
                  });
                // temporary set customer timezone WIB
                // @ts-ignore
                this.payload.customer?.timezone =
                  customer_location?.timezone ?? 'WIB';
              } else {
                result.eligible = false;
                result.reason = 'MSISDN Not Allowed';
                this.payload.reason = 'MSISDN Not Allowed';
                result.notification_group =
                  NotificationTemplateConfig.REDEEM_FAILED_GENERAL;
              }
            } else {
              this.customerFromCore = checkCustomer[0];
              // customize core to payload customer for location
              if (this.dspRes?.eligible) {
                this.payload.customer.area = this.dspRes['payload']['area']
                  ? this.dspRes['payload']['area']
                  : this.customerFromCore.area_sales;
                if (this.dspRes['payload']['area']) {
                  this.customerFromCore.area_sales =
                    this.dspRes['payload']['area'];
                }

                this.payload.customer.region = this.dspRes['payload'][
                  'regional'
                ]
                  ? this.dspRes['payload']['regional']
                  : this.customerFromCore.region_sales;
                if (this.dspRes['payload']['regional']) {
                  this.customerFromCore.region_sales =
                    this.dspRes['payload']['regional'];
                }

                this.payload.customer.city = this.dspRes['payload']['kabupaten']
                  ? this.dspRes['payload']['kabupaten']
                  : this.customerFromCore.kabupaten;
                if (this.dspRes['payload']['kabupaten']) {
                  this.customerFromCore.kabupaten =
                    this.dspRes['payload']['kabupaten'];
                }
              } else {
                this.payload.customer.area = this.customerFromCore.area_sales;
                this.payload.customer.region =
                  this.customerFromCore.region_sales;
                this.payload.customer.city = this.customerFromCore.kabupaten;
              }
              this.payload.customer.member_type =
                this.customerFromCore.member_type;

              // Set customer location id
              const customer_location = await this.getCustomerLocation(payload);

              this.payload.customer.location_id =
                customer_location?.customer_location_id;
              this.payload.keyword_location_id =
                customer_location?.keyword_location_id;
              this.payload.keyword_location_type =
                customer_location?.keyword_location_type;
              // temporary set customer timezone WIB
              // @ts-ignore
              this.payload.customer?.timezone =
                customer_location?.timezone ?? 'WIB';
            }
          })
          .catch((e) => {
            console.log(`Error : ${JSON.stringify(e, null, 2)}`);
            result.eligible = false;
            this.payload.reason = e.message;
            result.reason = e.message;
            result.notification_group =
              NotificationTemplateConfig.REDEEM_FAILED_GENERAL;
            return result;
            // throw new Error(e.message);
          });
      } else {
        result.eligible = false;
        result.reason = 'MSISDN Not Allowed';
        this.payload.reason = 'MSISDN Not Allowed';
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_GENERAL;
        return result;
      }
    }

    // temporary timezone eligibility
    // @ts-ignore
    this.payload.customer?.timezone = this.payload.customer?.timezone ?? 'WIB';

    let programs;

    if (this.programName && result.eligible) {
      programs = this.programProfileData;

      if (!programs) {
        result.eligible = false;
        result.reason = 'Program not found';
        this.payload.reason = 'Program not found';
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_GENERAL;
        return result;
      }
      this.program = programs;
    }

    if (this.keywordName && result.eligible) {
      this.keyword = await this.keywordService.findKeywordByNameWithRedis(
        this.keywordName,
      );
      if (!this.keyword) {
        if (this.keywordName === programs.keyword_registration) {
          result.eligible = true;
          result.reason = 'Is keyword registration exception';
          this.payload.reason = 'Is keyword registration exception';
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        } else {
          result.eligible = false;
          result.reason = 'Keyword not found';
          this.payload.reason = 'Keyword not found';
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_GENERAL;
          return result;
        }
        this.keywordProfile = this.payload.keyword.eligibility;
      } else {
        this.keywordProfile = this.keyword.eligibility;
      }

      // this.keywordProfile = this.keyword.eligibility;
    }
    return result;
  }

  /**
   * This service for check start and end periode
   * @param submitTime
   */
  async checkByStartAndEndPeriod(submitTime: string) {
    if (this.keywordName) {
      const getkeyword = this.keywordProfileData;

      let keyword_start_period = getkeyword?.start_period;
      let keyword_end_period = getkeyword?.end_period;

      if (typeof getkeyword.start_period == 'object') {
        keyword_start_period = getkeyword?.start_period.toISOString();
        keyword_end_period = getkeyword?.end_period.toISOString();
      }

      if (
        submitTime.split(' ', 1)[0] >=
          keyword_start_period
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0] &&
        submitTime.split(' ', 1)[0] <=
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

    if (this.programName) {
      const programData = this.programProfileData;
      if (
        submitTime.split(' ', 1)[0] >=
          programData.start_period
            .toJSON()
            .replace(/T/, ' ')
            .replace(/\..+/, '')
            .split(' ', 1)[0] &&
        submitTime.split(' ', 1)[0] <=
          programData.start_period
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

  async convertTimezone(
    custTimezone,
    program_time_zone,
    startPeriod,
    endPeriod,
    submitTime,
  ) {
    // Function to add hours to a given date
    function addHours(date, hours) {
      return new Date(date.getTime() + hours * 60 * 60 * 1000);
    }

    // Adjust start period, end period, and submit time based on the program time zone
    const startDate = new Date(startPeriod);
    const endDate = new Date(endPeriod);
    const submitDateTime = new Date(submitTime);

    return {
      startDate: startDate,
      endDate: endDate,
      submitTime: submitDateTime,
    };
  }

  /**
   * This service for check program by start and end periode
   * @param submitTime
   */
  async checkProgramByStartAndEndPeriod(submitTime: string) {
    if (this.programName) {
      const programData = this.payload.program;

      const data = await this.convertTimezone(
        this.payload.customer?.timezone,
        programData?.program_time_zone,
        programData?.start_period,
        programData?.end_period,
        submitTime,
      );

      const validDate =
        data.submitTime >= data.startDate && data.submitTime <= data.endDate;

      if (validDate) {
        return {
          eligible: true,
          reason: '',
          notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
        };
      } else {
        return {
          eligible: false,
          reason: '',
          notification_group:
            NotificationTemplateConfig.REDEEM_FAILED_INACTIVEPROGRAM,
        };
      }
    }
  }

  /**
   * This service for check start and end periode
   * @param submitTime
   */
  async checkByKeywordStartAndEndPeriod(submitTime: string) {
    if (this.keywordName && this.programName) {
      const programData = this.payload.program;
      const keywordData = this.payload.keyword;

      const data = await this.convertTimezone(
        this.payload.customer?.timezone,
        programData?.program_time_zone,
        keywordData?.eligibility?.start_period,
        keywordData?.eligibility?.end_period,
        submitTime,
      );

      const validDate =
        data.submitTime >= data.startDate && data.submitTime <= data.endDate;

      if (validDate) {
        return {
          eligible: true,
          reason: '',
          notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
        };
      } else {
        return {
          eligible: false,
          reason: '',
          notification_group:
            NotificationTemplateConfig.REDEEM_FAILED_INACTIVE_KEYWORD,
        };
      }
    }
  }

  /**
   * function program whitelist & blacklist check
   * @param msisdn
   * @param programId
   * @param whitelistCheck
   */
  async checkProgramWBList(): Promise<{
    reason: string;
    notification_group: NotificationTemplateConfig;
    eligible: boolean;
  }> {
    // formatMsisdnToID(this.msisdn)
    const tlseId = this.payload?.incoming?.tsel_id ?? '';
    const result = await this.programService.checkProgramWBList(
      tlseId,
      formatMsisdnToID(this.msisdn),
      this.program._id.toString(),
      this.program?.whitelist_check,
    );

    if (result.eligible) {
      if (this.program.whitelist_counter) {
        await this.reduceWhitelistCounter(
          this.program._id.toString(),
          this.keywordName,
          this.msisdn,
        );
      }
    }

    return result;
  }

  /**
   * Function for reduce whitelist counter
   */
  async reduceWhitelistCounter(
    program: string,
    keyword: string,
    msisdn: string,
  ) {
    const res = await this.whitelistService.reduceCounter(
      program,
      keyword,
      msisdn,
    );

    if (res) {
      this.payload.is_whitelist_deducted = true;
    }

    return res;
  }

  /**
   * This service for check program by whitelist
   */
  async checkProgramWhitelist() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const cond = { msisdn: this.msisdn };
    return await this.programService
      .getProgramWBlist(cond, 'whitelist', this.program._id.toString())
      .then((res) => {
        if (res.total > 1) {
          result.reason = `Program and msisdn is not in whitelist`;
          result.eligible = false;
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_WHITELIST;
          return result;
        }

        result.eligible = true;
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        return result;
      });
  }

  /**
   * This service for check program by blacklist
   */
  async checkProgramBlacklist() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const cond = { msisdn: this.msisdn };
    return await this.programService
      .getProgramWBlist(cond, 'blacklist', this.program._id.toString())
      .then((res) => {
        if (res.total > 1) {
          result.reason = `Program and msisdn in blacklist`;
          result.eligible = false;
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_BLACKLIST;
          return result;
        }

        result.eligible = true;
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        return result;
      });
  }

  /**
   * This function for check schedule of keyword
   * @param submitTime
   */
  async checkByKeywordSchedule(submitTime: string) {
    const keyword = this.payload.keyword;
    const programData = this.payload.program;
    const typeSchedule = keyword.eligibility?.keyword_schedule;
    const program_timezone = programData?.program_time_zone
      ? programData?.program_time_zone
      : 'WIB';

    // Fungsi untuk menambahkan jam berdasarkan zona waktu
    function addHoursToTime(dateString, hours) {
      const date = new Date(dateString);
      date.setHours(date.getHours() + hours);
      return date.toISOString();
    }

    const keywordResult = await this.checkByKeywordStartAndEndPeriod(
      submitTime,
    );

    if (typeSchedule === 'Daily') {
      return keywordResult;
    }

    if (typeSchedule === 'Shift') {
      if (keywordResult.eligible) {
        /** Replace all mechanism timezone with WIB - 2024-07-03 **/
        submitTime = addHoursToTime(submitTime, 7);

        const time = new Date(submitTime);
        const submitHours = time.getUTCHours();
        const submitMinutes = time.getUTCMinutes();

        function convertOffsetTo07(obj) {
          const newObj = JSON.parse(JSON.stringify(obj)); // Deep copy of the object
          newObj.eligibility.keyword_shift =
            newObj.eligibility.keyword_shift.map((shift) => {
              return {
                from: shift.from.replace(/\+\d{2}:\d{2}$/, '+00:00'),
                to: shift.to.replace(/\+\d{2}:\d{2}$/, '+00:00'),
              };
            });

          return newObj;
        }

        const convertedKeyword = convertOffsetTo07(keyword);

        const keyword_shift = convertedKeyword.eligibility.keyword_shift.map(
          (keyword_shiftItem) => {
            const from = new Date(keyword_shiftItem.from);
            const fromHours = from.getUTCHours();
            const fromMinutes = from.getUTCMinutes();

            const to = new Date(keyword_shiftItem.to);
            const toHours = to.getUTCHours();
            const toMinutes = to.getUTCMinutes();

            const submitTimeInMinutes = submitHours * 60 + submitMinutes;
            const fromTimeInMinutes = fromHours * 60 + fromMinutes;
            const toTimeInMinutes = toHours * 60 + toMinutes;

            if (
              submitTimeInMinutes >= fromTimeInMinutes &&
              submitTimeInMinutes <= toTimeInMinutes
            ) {
              return true;
            } else {
              return false;
            }
          },
        );
        const keyword_shift_status_aucation =
          this.payload?.keyword.eligibility.keyword_shift;

        for (
          let index = 0;
          index < keyword_shift_status_aucation.length;
          index++
        ) {
          const shift = keyword_shift_status_aucation[index];
          const status = keyword_shift[index];
          shift.status = status;
        }

        const isValid = keyword_shift.some((value) => value === true);
        if (isValid) {
          return {
            eligible: true,
            reason: '',
            notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
          };
        } else {
          return {
            eligible: false,
            reason: '',
            notification_group:
              NotificationTemplateConfig.REDEEM_FAILED_INACTIVE_KEYWORD,
          };
        }
      } else {
        return {
          eligible: false,
          reason: '',
          notification_group:
            NotificationTemplateConfig.REDEEM_FAILED_INACTIVE_KEYWORD,
        };
      }
    }
  }

  /**
   * This function for check customer max redeem
   */
  async checkByMaxRedeem() {
    const notifGroup = '';

    const msisdnCustomer = '62' + this.msisdn.slice(1);

    return await this.redeemModel
      .findOne({
        msisdn: msisdnCustomer,
        keyword_redeem: this.keywordName,
        deleted_at: null,
      })
      .then(async (redeemRes) => {
        if (!redeemRes)
          return {
            eligible: false,
            reason: 'Customer redeem not found',
            notification_group: notifGroup,
          };

        const keywordRes = this.keywordProfileData;

        if (!keywordRes)
          return {
            eligible: false,
            reason: 'Customer redeem keyword not found',
            notification_group: notifGroup,
          };

        if (keywordRes.max_mode === '') {
          return {
            eligible: true,
            reason: '',
            notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
          };
        } else {
          if (
            redeemRes.hasOwnProperty('total_redeem') &&
            keywordRes.hasOwnProperty('max_redeem_counter') &&
            redeemRes.total_redeem <= keywordRes.max_redeem_counter
          )
            return {
              eligible: true,
              reason: '',
              notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
            };
          else
            return {
              eligible: false,
              reason: 'Customer has reach maximum redeem',
              notification_group:
                NotificationTemplateConfig.REDEEM_FAILED_MAXREDEEM,
            };
        }
      });
  }

  /**
   * This fuction for check by new redeemer
   */
  async checkByNewRedeemer() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (this.keywordProfile.for_new_redeemer) {
      if (this.payload.customer.last_redeemed_date) {
        const last_redeemed_date = this.payload.customer.last_redeemed_date;
        const today = moment();
        const year = today.year();
        const month = today.month();

        if (
          moment(last_redeemed_date).year() === year &&
          month >= 0 &&
          month <= 11
        ) {
          result.reason = `${moment(
            last_redeemed_date,
          ).year()} , ${year} ,  ${month} , Fail Check New Redeemer`;
          result.eligible = false;
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_NEWREDEEMER;
        } else {
          result.eligible = true;
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
      }
      return result;
    }

    return result;
  }

  /**
   * This function for check channel from defined keyword
   * @param channelId
   */
  async checkByChannel(channelId: any) {
    const channelList = this.keywordProfile.channel_validation_list_info;

    if (this.keywordProfile.channel_validation) {
      if (!channelId) {
        return {
          eligible: false,
          reason: 'Channel not found',
          notification_group:
            NotificationTemplateConfig.REDEEM_FAILED_INVALID_KEYWORD_CHANNEL,
        };
      }
      const result = channelList.some((item) => {
        return item.code.toString() == channelId?.toString();
      });

      return {
        eligible: result,
        reason: result ? '' : 'Keyword channel validation not found',
        notification_group: result
          ? NotificationTemplateConfig.REDEEM_SUCCESS
          : NotificationTemplateConfig.REDEEM_FAILED_INVALID_KEYWORD_CHANNEL,
      };
    } else {
      return {
        eligible: true,
        reason: '',
        notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
      };
    }
  }

  /**
   * This function for check keyword if has need registration
   */
  async checkByRegistration() {
    const result = {
      eligible: false,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_FAILED_NOREG,
    };

    return await this.programService
      .findProgramByIdWithRedis(this.keyword.eligibility.program_id)
      .then(async (programRes) => {
        if (!programRes) {
          result.reason = 'Program not found';
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_NOREG;
          return result;
        }

        if (
          programRes.hasOwnProperty('keyword_registration') &&
          programRes.keyword_registration == ''
        ) {
          result.reason = 'No registration need';
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
          result.eligible = true;
          return result;
        }

        const redeemRes = this.redeemRes;
        if (!redeemRes) {
          result.reason = 'Customer has not registered';
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_NOREG;
          return result;
        }

        result.eligible = true;
        return result;
      });
  }

  /**
   * This function is to check if the keyword is already registered
   */
  async checkKeywordAlreadyRegistered() {
    const result = {
      eligible: false,
      reason: '',
      notification_group:
        NotificationTemplateConfig.KEYWORD_REGISTRATION_SUCCESS,
    };

    if (this.payload.is_keyword_registration) {
      const redeemRes = await this.redeemModel
        .findOne({
          msisdn: this.msisdn,
          keyword: this?.payload?.program?.keyword_registration,
          deleted_at: null,
          status: 'Success',
        })
        .then(async (redeemRes) => {
          return redeemRes;
        });
      if (redeemRes) {
        result.reason = 'Keyword has been already registered';
        result.notification_group =
          NotificationTemplateConfig.KEYWORD_REGISTRATION_DONE;
        return result;
      }

      result.eligible = true;
      return result;
    } else {
      const redeemRes = await this.redeemModel
        .findOne({
          msisdn: this.msisdn,
          keyword: this?.payload?.program?.keyword_registration,
          deleted_at: null,
          status: 'Success',
        })
        .then(async (redeemRes) => {
          return redeemRes;
        });
      if (!redeemRes) {
        result.reason = 'Please register keywords first';
        result.notification_group =
          NotificationTemplateConfig.KEYWORD_REGISTRATION_FAILED;
        return result;
      }

      result.eligible = true;
      return result;
    }
  }

  /**
   * This function for check program approve status
   */
  async checkByProgramApproveStatus() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const programApprove = this.programApprove;
    if (
      !this.program ||
      !this.program?.program_approval ||
      programApprove.toString() !== this.program.program_approval.toString()
    ) {
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_INACTIVEPROGRAM;
      result.reason = 'Program has not approved';
      result.eligible = false;
    }

    return result;
  }

  /**
   * This function for check program approve status
   */
  async checkByProgramStopStatus() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    if (this.program?.is_stoped === true) {
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_INACTIVEPROGRAM;
      result.reason = 'Program has not approved';
      result.eligible = false;
    }

    return result;
  }

  /**
   * This function for check program and keyword approve status
   */
  async checkByKeywordApproveStatus() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const keywordApprove = this.keywordApprove;
    if (
      this?.keyword?.hasOwnProperty('keyword_approval') &&
      keywordApprove.toString() !== this.keyword.keyword_approval.toString()
    ) {
      result.reason = 'Keyword has not approved';
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_INACTIVE_KEYWORD;
      return result;
    }

    result.eligible = true;
    return result;
  }

  /**
   * This function for check program and keyword approve status
   */
  async checkByKeywordApproveStatusStop() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    if (this.keyword?.is_stoped === true) {
      result.reason = 'Keyword has not approved';
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_INACTIVE_KEYWORD;
      return result;
    }

    result.eligible = true;
    return result;
  }

  /**
   * This function for check program and keyword approve status
   */
  async checkByProgramAndKeywordApproveStatus() {
    const result = { eligible: true, reason: '' };

    return await this.programService
      .getProgramByName(this.programName)
      .then(async (programRes) => {
        if (!programRes) {
          result.reason = 'Program not found';
          return result;
        }
        const programData = programRes[0];

        const programApprove = this.programApprove;
        if (
          programApprove.toString() != programData.program_approval.toString()
        ) {
          result.reason = 'Program has not approved';
          return result;
        }

        const keywordData = this.keywordProfileData;

        if (!keywordData) {
          result.reason = 'Keyword not found';
        }

        const keywordApprove = this.keywordApprove;
        if (
          keywordApprove.toString() !=
          keywordData.keyword_approval_info._id.toString()
        ) {
          result.reason = 'Keyword has not approved';
        }

        result.eligible = true;
        return result;
      });
  }

  /**
   * This function for check by point type and value
   */
  async checkByPoinTypeAndValue(token: string) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    const _this = this;

    const keywordData = this.keywordProfileData;

    if (!keywordData) {
      result.reason = 'Keyword not found';
      return result;
    }

    if (!this.payload.program.point_type) {
      result.reason = 'No point type for this keyword';
      return result;
    }

    keywordData.point_type = this.payload.program.point_type;

    const pointType = await _this.lovService.getLovDetail(
      keywordData.point_type.toString(),
    );
    const pointId = pointType.additional.split('|');

    return await new Promise(async (resolve, _) => {
      const options = {
        method: 'GET',
        hostname: this.raw_core,
        port: this.raw_port > 0 ? this.raw_port : null,
        path: `/gateway/v3.0/members/${this.payload.customer.core_id}/wallet?merchant_id=${this.merchant}`,
        headers: {
          Authorization: `${token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, function (res) {
        const chunks = [];
        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks) {
            const body = Buffer.concat(chunks);
            if (isJson(body.toString())) {
              const resp = JSON.parse(body.toString());
              const resPayload = resp?.payload?.wallet;

              if (resp?.payload && resp.code === 'S00000') {
                const keywordPoinNeed = keywordData.poin_redeemed;

                pointId.forEach(function (item) {
                  if (resPayload.pocket.reward[item]) {
                    if (resPayload.pocket.reward[item] > keywordPoinNeed) {
                      result.eligible = true;
                    }
                  }
                });
              } else {
                result.reason = 'Fail to get customer point';
              }
            } else {
              result.reason = 'Fail to get customer point';
            }
            resolve(result);
          }
        });
      });

      req.on('error', function (e) {
        result.reason = 'Fail to get customer point. Fetch';
        resolve(result);
      });

      req.end();
    });
  }

  /**
   * This function for check by segmentation
   */
  async checkBySegmentation() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const keywordLocations = this.keywordProfile.locations;
    if (keywordLocations.length == 0) {
      result.reason = 'No location for this keyword';
      return result;
    }

    const getLocation = await this.locationService.detailLocationByName(
      this.payload.customer.region_lacci,
    );
    if (getLocation) {
      if (keywordLocations.includes(getLocation._id.toString())) {
        result.eligible = true;
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
      } else {
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_LOCATION;
        result.reason = 'Customer region not eligible for this keyword';
      }
    } else {
      result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
      result.reason = 'Customer region not found in locations';
    }

    return result;
  }

  /**
   * This function for check by donation
   * @param donationVal
   */
  async checkByDonation(
    keywordId: string,
    keywordName: string,
    keyword: any,
    redeem: any,
  ) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: '',
    };

    const minPoint = keyword[0].minimum_poin;
    const maxPoint = keyword[0].target_poin;
    const redeemPoint = redeem.total_redeem;
    const dtDonation = await this.donationService.donationCurrentByKeyword(
      keywordId.toString(),
    );
    if (redeemPoint < minPoint) {
      result.eligible = false;
      result.reason = 'Points less than the minimum limit';
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_INSUFFICIENT_BALANCE;
    }

    if (dtDonation) {
      const totalCurrentPoint =
        dtDonation.donation_current + dtDonation.donation_queue;
      if (redeemPoint + totalCurrentPoint > maxPoint) {
        result.eligible = false;
        result.reason = 'Target points have been reached';
        result.notification_group =
          NotificationTemplateConfig.DON_TARGET_REACHED;
      }
    }
    if (result.eligible) {
      const incoming = await this.donationService.donateEligibility({
        ...this.payload.redeem,
        total_redeem: redeemPoint,
      });
      // send to payload to trx master to process fail or success
      return { result, incoming: { incoming, total_redeem: redeemPoint } };
    }

    return result;
  }

  /**
   * This function for check by customer tier
   */

  async checkByCustomerTier(payload) {
    const tsel_tier_id =
      payload?.payload?.tsel_id?.wallet_sibling[0].tsel_tier_id;

    // NOTES: Tier checking with tselid/b_number is combined
    return await this.checkByCustomerTierByMsisdn(tsel_tier_id);
  }

  async checkByCustomerTierByMsisdn(tsel_tier_id) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    let targetTierID;
    if (tsel_tier_id) {
      targetTierID = tsel_tier_id;
    } else {
      targetTierID = this.customerFromCore?.payload
        ? this.customerFromCore?.payload?.tier_id
        : this.customerFromCore?.tier_id;
    }
    const getCustTiersFromCore =
      await this.customerService.getCustomerTiersByNameOrID(targetTierID, true);

    if (this.keywordProfile.segmentation_customer_tier.length) {
      const custTier = getCustTiersFromCore?._id;
      result.eligible = this.keywordProfile.segmentation_customer_tier.some(
        (item) => {
          return item?.toString() == custTier?.toString();
        },
      );
    }

    if (!result.eligible) {
      // push notif tier name from _id to name
      const listTier = [];
      for (
        let index = 0;
        index < this.keywordProfile.segmentation_customer_tier_info.length;
        index++
      ) {
        const element =
          this.keywordProfile.segmentation_customer_tier_info[index];
        listTier.push(element.name);
      }
      this.payload.keyword.eligibility.segmentation_customer_tier_name =
        listTier.join(',');

      result.eligible = false;
      result.reason = 'Tier/Level not match';
      result.notification_group = NotificationTemplateConfig.REDEEM_FAILED_TIER;
    }
    return result;
  }

  /**
   * This function for matching check for customer LOS and keyword segmentation los
   */
  async checkByCustomerLos() {
    const result = {
      eligible: false,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_FAILED_LOS,
    };

    if (this.keywordProfile.segmentation_customer_los_operator) {
      if (!this.customerFromCore.hasOwnProperty('los')) {
        result.eligible = false;
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_LOS;
        result.reason = 'Customer los not found';

        return result;
      }
    }

    this.payload.customer.los = this.customerFromCore.los;

    switch (this.keywordProfile.segmentation_customer_los_operator) {
      case 'LessThan':
        result.eligible =
          this.payload.customer.los <
          this.keywordProfile.segmentation_customer_los;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'LessOrEqualTo':
        result.eligible =
          this.payload.customer.los <=
          this.keywordProfile.segmentation_customer_los;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'EqualTo':
        result.eligible =
          this.payload.customer.los ==
          this.keywordProfile.segmentation_customer_los;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;
      case 'MoreThan':
        result.eligible =
          this.payload.customer.los >
          this.keywordProfile.segmentation_customer_los;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'MoreOrEqualTo':
        result.eligible =
          this.payload.customer.los >=
          this.keywordProfile.segmentation_customer_los;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'Ranged':
        result.eligible =
          this.payload.customer.los >=
            this.keywordProfile.segmentation_customer_los_min &&
          this.payload.customer.los <=
            this.keywordProfile.segmentation_customer_los_max;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      default:
        result.eligible = true;
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        break;
    }

    return result;
  }

  /**
   * This function for matching check for customer type
   */
  async checkByCustomerType() {
    let { segmentation_customer_type } = this.keywordProfile;
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    if (!this.customerFromCore.hasOwnProperty('member_type')) {
      this.customerFromCore.member_type = 'Regular';
    }

    if (!this.customerFromCore.member_type) {
      this.customerFromCore.member_type = 'Regular';
    }

    if (segmentation_customer_type) {
      if (segmentation_customer_type !== 'Both') {
        segmentation_customer_type =
          segmentation_customer_type === 'CorporateOnly'
            ? 'Corporate'
            : 'Regular';

        result.eligible =
          segmentation_customer_type == this.customerFromCore.member_type;

        if (!result.eligible) {
          result.eligible = false;
          result.reason = 'Customer type not match with keyword segmentation';
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_CUSTTYPE;
        }
      }
    }

    return result;
  }

  /**
   * This function for check by customer brand
   */
  async checkByCustomerBrand() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };
    if (this.customerFromCore.brand) {
      this.payload.customer.brand = this.customerFromCore.brand;
    }

    if (this.keywordProfile.segmentation_customer_brand.length) {
      if (this.customerFromCore.hasOwnProperty('payload')) {
        this.customerFromCore.brand = this.customerFromCore.payload.brand;
      } else {
        if (!this.customerFromCore.hasOwnProperty('brand')) {
          const listBrand = [];
          for (
            let index = 0;
            index < this.keywordProfile.segmentation_customer_brand_info.length;
            index++
          ) {
            const element =
              this.keywordProfile.segmentation_customer_brand_info[index];
            listBrand.push(element.name);
          }
          this.payload.keyword.eligibility.segmentation_customer_brand_name =
            listBrand.join(',');

          result.eligible = false;
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_BRAND;
          result.reason = 'Customer brand not found';

          return result;
        }
      }

      result.eligible =
        this.keywordProfile.segmentation_customer_brand_info.some((item) => {
          return (
            item.name.toUpperCase() == this.customerFromCore.brand.toUpperCase()
          );
        });
    }

    if (!result.eligible) {
      // push notif brand name from _id to name
      const listBrand = [];
      for (
        let index = 0;
        index < this.keywordProfile.segmentation_customer_brand_info.length;
        index++
      ) {
        const element =
          this.keywordProfile.segmentation_customer_brand_info[index];
        listBrand.push(element.name);
      }
      this.payload.keyword.eligibility.segmentation_customer_brand_name =
        listBrand.join(',');

      result.eligible = false;
      result.reason = 'Brand is not match';
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_BRAND;
    }

    return result;
  }

  /**
   * This function for check by customer employee status
   */
  async checkByCustomerEmployee() {
    const result = {
      eligible: false,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (this.keywordProfile.segmentation_telkomsel_employee) {
      if (!this.customerFromCore.hasOwnProperty('telkomsel_employee')) {
        result.eligible = true;
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        result.reason = 'Customer telkomsel_employee not found';

        return result;
      }
    }

    if (this.keywordProfile.segmentation_telkomsel_employee === true) {
      result.eligible = true;
      if (!result.eligible) {
        result.reason =
          'Hanya dapat diikuti oleh pelanggan kategori Telkomsel Employee';
        result.eligible = false;
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_EMPLOYEE;
      }
    } else if (this.keywordProfile.segmentation_telkomsel_employee === false) {
      const custEmployee = this.customerFromCore.telkomsel_employee !== 'Y';
      result.eligible = custEmployee;
      if (!result.eligible) {
        result.reason =
          'Hanya dapat diikuti oleh pelanggan kategori selain Telkomsel Employee';
        result.eligible = false;
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_NON_EMPLOYEE;
      }
    } else {
      result.eligible = true;
      result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
    }
    return result;
  }

  /**
   * This function for matching check for customer LOS and keyword segmentation arpu
   */
  async checkByCustomerArpu() {
    const result = {
      eligible: false,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_FAILED_ARPU,
    };

    this.payload.customer.arpu = parseInt(this.customerFromCore.arpu);
    switch (this.keywordProfile.segmentation_customer_arpu_operator) {
      case 'LessThan':
        result.eligible =
          this.payload.customer.arpu <
          this.keywordProfile.segmentation_customer_arpu;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'LessOrEqualTo':
        result.eligible =
          this.payload.customer.arpu <=
          this.keywordProfile.segmentation_customer_arpu;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'EqualTo':
        result.eligible =
          this.payload.customer.arpu ==
          this.keywordProfile.segmentation_customer_arpu;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }

        break;
      case 'MoreThan':
        result.eligible =
          this.payload.customer.arpu >
          this.keywordProfile.segmentation_customer_arpu;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'MoreOrEqualTo':
        result.eligible =
          this.payload.customer.arpu >=
          this.keywordProfile.segmentation_customer_arpu;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      case 'Ranged':
        result.eligible =
          this.payload.customer.arpu >=
            this.keywordProfile.segmentation_customer_arpu_min &&
          this.payload.customer.arpu <=
            this.keywordProfile.segmentation_customer_arpu_max;
        if (result.eligible) {
          result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        }
        break;

      default:
        result.eligible = true;
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        break;
    }

    return result;
  }

  /**
   * This function for compare imei config keyword and customer imei
   */
  async checkByMei() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (this.keywordProfile.imei_operator) {
      result.reason = 'App name and app category not match';
      result.notification_group = NotificationTemplateConfig.REDEEM_FAILED_IMEI;

      // name
      const imei_value = this.keywordProfile?.imei?.toLowerCase();
      const imei_operator = this.keywordProfile?.imei_operator;
      const imei_user = this.customerFromCore?.imei?.toLowerCase();

      result.eligible = false;

      if (imei_operator) {
        if (!imei_user) {
          result.reason = 'Customer from core not have imei';
          return result;
        }

        if (imei_operator === 'EQUAL') {
          if (imei_user === imei_value) {
            result.eligible = true;
          }
        } else if (imei_operator === 'CONTAINS') {
          if (imei_user.indexOf(imei_value) !== -1) {
            result.eligible = true;
          }
        } else if (imei_operator === 'START WITH') {
          if (imei_user.startsWith(imei_value)) {
            result.eligible = true;
          }
        } else if (imei_operator === 'END WITH') {
          if (imei_user.endsWith(imei_value)) {
            result.eligible = true;
          }
        }
      }

      if (result.eligible) {
        result.reason = '';
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        result.eligible = true;
      }
    }
    return result;
  }

  /**
   * This function for compare app name and category between keyword and customer profile
   */
  async checkByBcpApp() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (
      this.keywordProfile.bcp_app_name_operator ||
      this.keywordProfile.bcp_app_category_operator
    ) {
      result.reason = 'App name and app category not match';
      result.eligible = false;
      result.notification_group = NotificationTemplateConfig.REDEEM_FAILED_BCP;

      // name
      const bcp_app_name = this.keywordProfile?.bcp_app_name?.toLowerCase();
      const bcp_app_name_operator = this.keywordProfile?.bcp_app_name_operator;
      const app_name = this.customerFromCore?.app_name?.toLowerCase();
      let eligibleName = false;

      // category
      const bcp_app_category =
        this.keywordProfile?.bcp_app_category?.toLowerCase();
      const bcp_app_category_operator =
        this.keywordProfile?.bcp_app_category_operator;
      const app_cat = this.customerFromCore?.app_cat?.toLowerCase();
      let eligibleCategory = false;

      if (bcp_app_name_operator) {
        if (!app_name) {
          result.reason = 'Customer from core not have app name';
          return result;
        }

        if (bcp_app_name_operator === 'EQUAL') {
          if (app_name === bcp_app_name) {
            eligibleName = true;
          }
        } else if (bcp_app_name_operator === 'CONTAINS') {
          if (app_name.indexOf(bcp_app_name) !== -1) {
            eligibleName = true;
          }
        } else if (bcp_app_name_operator === 'START WITH') {
          if (app_name.startsWith(bcp_app_name)) {
            eligibleName = true;
          }
        } else if (bcp_app_name_operator === 'END WITH') {
          if (app_name.endsWith(bcp_app_name)) {
            eligibleName = true;
          }
        }
      }

      if (bcp_app_category_operator) {
        if (!app_cat) {
          result.reason = 'Customer from core not have app category';
          return result;
        }

        if (bcp_app_category_operator === 'EQUAL') {
          if (app_cat === bcp_app_category) {
            eligibleCategory = true;
          }
        } else if (bcp_app_category_operator === 'CONTAINS') {
          if (app_cat.indexOf(bcp_app_category) !== -1) {
            eligibleCategory = true;
          }
        } else if (bcp_app_category_operator === 'START WITH') {
          if (app_cat.startsWith(bcp_app_category)) {
            eligibleCategory = true;
          }
        } else if (bcp_app_category_operator === 'END WITH') {
          if (app_cat.endsWith(bcp_app_category)) {
            eligibleCategory = true;
          }
        }
      }

      if (
        this.keywordProfile.bcp_app_name_operator &&
        this.keywordProfile.bcp_app_category_operator &&
        eligibleName &&
        eligibleCategory
      ) {
        result.eligible = true;
      } else if (
        this.keywordProfile.bcp_app_name_operator &&
        !this.keywordProfile.bcp_app_category_operator &&
        eligibleName
      ) {
        result.eligible = true;
      } else if (
        !this.keywordProfile.bcp_app_name_operator &&
        this.keywordProfile.bcp_app_category_operator &&
        eligibleCategory
      ) {
        result.eligible = true;
      }

      if (result.eligible) {
        result.reason = '';
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
        result.eligible = true;
      } else {
        // push notif bcp app name
        const keywordBCPOperator = [
          bcp_app_name_operator,
          bcp_app_category_operator,
        ];
        const keywordBCPValue = [bcp_app_name, bcp_app_category];
        this.payload.keyword.eligibility.keywordBCPOperator =
          keywordBCPOperator.join(',');
        this.payload.keyword.eligibility.keywordBCPValue =
          keywordBCPValue.join(',');
      }
    }

    return result;
  }

  /**
   * This function is for validating prepaid regist
   */
  async checkPrepaidRegist() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (this.keywordProfile.segmentation_customer_prepaid_registration) {
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_PREPAID_REGISTRATION;

      const regist_status = this.customerFromCore?.nik_registration_status
        ? this.customerFromCore?.nik_registration_status.toLowerCase()
        : null;

      result.reason = `Failed Prepaid Regist ${regist_status}`;

      if (
        (regist_status && regist_status === 's') ||
        (regist_status && regist_status === 'd')
      ) {
        result.eligible = true;
        result.reason = '';
        result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
      }
      return result;
    }

    return result;
  }

  /**
   * This function is for validating Check Flash Sale
   */
  async checkFlashSale(submitTime: string) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    // if (this.payload.keyword?.eligibility?.flashsale?.status) {
    const programData = this.payload.program;

    const data = await this.convertTimezone(
      this.payload.customer?.timezone,
      programData?.program_time_zone,
      this.payload.keyword?.eligibility?.flashsale?.start_date,
      this.payload.keyword?.eligibility?.flashsale?.end_date,
      submitTime,
    );

    const validDate =
      data.submitTime >= data.startDate && data.submitTime <= data.endDate;

    if (validDate) {
      this.payload.is_flashsale = true;
    }
    // }

    return result;
  }

  /**
   * This function is for validating customer location
   */
  async checkByLocation() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (
      !this.validateLocationBI({
        keyword_location_type: this.payload?.keyword_location_type,
        keyword_location_id: this.payload?.keyword_location_id?.toString(),
        customer_location_id: this.payload?.customer?.location_id?.toString(),
        keyword_stock_location: this.payload.keyword.bonus.filter(
          (item) => item.bonus_type == this.payload.bonus_type,
        )?.[0]?.stock_location,
      })
    ) {
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig?.REDEEM_FAILED_LOCATION;
      result.reason = 'Customer Location not match with keyword location.';
      return result;
    }

    return result;
  }

  async checkByLocationDSP(msisdn, tracing, channel_id) {
    const result = {
      eligible: true,
      payload: {},
      message: '',
    };
    const isEnabled = await this.callApiConfigService.callApiIsEnabled(
      CallApiConfig.API_DSP,
    );
    if (isEnabled) {
      const payloadData = {
        transaction_id: tracing,
        channel: channel_id ? channel_id : 'I1',
        service_id: msisdn,
        criteria: 'AREA&REGIONAL&KABUPATEN',
        imsi: '',
      };
      try {
        const data = await this.esbProfileService.post(payloadData);

        await this.loggerEligibility(
          this.loggerObject,
          `Request : ${JSON.stringify(
            payloadData,
          )}, Response : ${JSON.stringify(data)}, Info : `,
          this.startTime,
          false,
          this.url_dsp,
        );

        if (data.status === 200) {
          result.eligible = true;
          result.payload = data.payload?.network_profile;
        } else {
          result.eligible = false;
          if (data.payload?.transaction) {
            result.payload = data.payload?.transaction;
            result.message = data.payload?.transaction.status_desc
              ? data.payload?.transaction.status_desc
              : data.payload?.transaction.message;
            await this.loggerEligibility(
              this.loggerObject,
              `Gagal Login DSP dengan status code ${
                data.status
              } | message : ${JSON.stringify(data.payload)}`,
              this.startTime,
              true,
              this.url_dsp,
            );
          } else {
            result.payload = data.payload;
            await this.loggerEligibility(
              this.loggerObject,
              `Gagal Login DSP dengan status code ${
                data.status
              } | message : ${JSON.stringify(data.payload)}`,
              this.startTime,
              true,
              this.url_dsp,
            );
          }
        }
      } catch (error) {
        await this.loggerEligibility(
          this.loggerObject,
          `Request : ${JSON.stringify(
            payloadData,
          )}, Response : ${JSON.stringify(error)}, Info : ${error}`,
          this.startTime,
          false,
          this.url_dsp,
        );
        result.eligible = false;
        result.message = error;
        return result;
      }
      return result;
    } else {
      await this.loggerEligibility(
        this.loggerObject,
        `DSP Disable`,
        this.startTime,
        false,
        '',
      );
      result.message = `DSP Disable`;
      result.eligible = false;
      result.payload = {};
    }

    return result;
  }

  async getStockRedis(payload: any) {
    const { location, product, keyword, is_flashsale } = payload;
    let is_redis = false;
    const result = {
      balance: null,
      balance_flashsale: null,
      reason: 'Data from db',
      is_flashsale: is_flashsale,
    };

    const key = `${RedisDataKey.STOCK_KEY}-${keyword}-${location}`;
    const redisData: any = await this.cacheManager.get(key);

    if (redisData) {
      const stock = redisData.split('|');

      is_redis = true;

      result.balance = stock[0] || 0;
      result.balance_flashsale = stock[1] || 0;
      result.reason = 'Data from Redis';
    } else {
      const stock = await this.stockService.getStockDetail({
        location: location,
        product: product,
        keyword: keyword,
      });

      result.balance = stock?.balance || 0;
      result.balance_flashsale = stock?.balance_flashsale || 0;
    }

    return result;
  }

  /**
   * This function is for validates deduct stock - New 2024-09-17
   */
  async checkByStock() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const is_flashsale = this.payload?.is_flashsale || false;

    const keyword_id = this.payload?.keyword?._id?.toString();
    const product_id = getProductID(
      this.payload.bonus_type,
      this.configService,
    );

    this.payload.product_id = product_id;

    if (this.payload.bonus_type == 'direct_redeem') {
      this.payload.product_id =
        this.payload?.payload?.direct_redeem?.merchandise;
      console.log(`Merchandise product_id => ${this.payload.product_id}`);
    }

    // Check TRX has already been deducted
    if (this.payload?.is_stock_deducted) {
      result.reason = `Stock at Location ${this.payload?.keyword_location_id} has already been deducted`;
      return result;
    }

    // Check Stock Unlimited
    try {
      if (this.payload.keyword.bonus[0].stock_location.length > 0) {
        // TODO : TANAKA => Is it okay to check if stock_location is an empty array
        const checkLocation =
          this.payload.keyword.bonus[0].stock_location.filter(
            (e) => e.location_id == this.payload?.keyword_location_id,
          )[0];
        const checkStockUnlimited = checkLocation.stock == 0;
        if (checkStockUnlimited) {
          result.reason = `Stock at Location ${this.payload?.keyword_location_id} is unlimited`;
          return result;
        }
      } else {
        result.reason = `Stock at Location ${this.payload?.keyword_location_id} is unlimited`;
        return result;
      }
    } catch (error) {
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK;
      result.reason = `Error "${error.message}" at Location "${this.payload?.keyword_location_id}" is unlimited`;
      return result;
    }

    // Get stock from condition Redis
    const stock_detail: any = await this.getStockRedis({
      location: this.payload?.keyword_location_id,
      product: this.payload?.product_id,
      keyword: keyword_id,
      is_flashsale: is_flashsale,
    });

    console.log('X_STOCK_REDIS', stock_detail);

    const stockBalance = stock_detail?.balance ?? 0;
    const isFlashsale = is_flashsale;
    const flashsaleBalance = stock_detail?.balance_flashsale ?? 0;

    if (
      (stockBalance <= 0 && !isFlashsale) ||
      (isFlashsale && flashsaleBalance <= 0)
    ) {
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK;
      result.reason = 'Stock is empty.';
      return result;
    }

    // Deduct stock
    const deductStock = await this.deductStock(this.payload);
    if (deductStock.statusCode != 200) {
      switch (deductStock.stringCode) {
        case 'BOOKED_STOCK':
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_BOOKEDSTOCK;
          break;
        case 'NO_STOCK':
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK;
          break;
        default:
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_BOOKEDSTOCK;
          break;
      }

      result.eligible = false;
      result.reason = deductStock.msg;
      return result;
    }

    return result;
  }

  /**
   * This function is for validating empty stock - Take out 2024-09-17
   */
  async checkByStockOld() {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const keyword_id = this.payload?.keyword?._id?.toString();

    let product_id = getProductID(this.payload.bonus_type, this.configService);

    const stock_detail = await this.stockService.getStockDetail({
      location: this.payload?.keyword_location_id,
      product: product_id,
      keyword: keyword_id,
    });

    product_id = stock_detail?.product ? stock_detail?.product : null;
    this.payload.product_id = stock_detail?.product
      ? stock_detail?.product
      : null;

    const keyword_location_stock =
      this.payload.keyword.bonus
        .filter((item) => item.bonus_type == this.payload.bonus_type)?.[0]
        ?.stock_location?.filter(
          (item) => item.location_id == this.payload.keyword_location_id,
        )?.[0]?.stock ?? 0;

    if (keyword_location_stock === 0 || this.payload?.is_stock_deducted) {
      return result;
    }

    const stockBalance = stock_detail?.balance ?? 0;
    const isFlashsale = this.payload?.is_flashsale;
    const flashsaleBalance = stock_detail?.balance_flashsale ?? 0;

    if (
      (stockBalance <= 0 && !isFlashsale) ||
      (isFlashsale && flashsaleBalance <= 0)
    ) {
      result.eligible = false;
      result.notification_group =
        NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK;
      result.reason = 'Stock is empty.';
      return result;
    }

    // Deduct stock
    const deductStock = await this.deductStock(this.payload);
    if (deductStock.statusCode != 200) {
      switch (deductStock.stringCode) {
        case 'BOOKED_STOCK':
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_BOOKEDSTOCK;
          break;
        case 'NO_STOCK':
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK;
          break;
        default:
          result.notification_group =
            NotificationTemplateConfig.REDEEM_FAILED_BOOKEDSTOCK;
          break;
      }

      result.eligible = false;
      result.reason = deductStock.msg;
      return result;
    }

    return result;
  }

  private async deductStock(payload) {
    const rsp = {
      msg: 'Failed deduct stock',
      status: false,
      statusCode: 404,
      stringCode: 'GENERAL_CODE',
      payload: null,
    };

    const keyword_id = payload.keyword._id.toString();
    const product_id = this.payload.product_id;

    const keyword_location_stock =
      payload.keyword.bonus
        .filter((item) => item.bonus_type == payload.bonus_type)?.[0]
        ?.stock_location?.filter(
          (item) => item.location_id == payload.keyword_location_id,
        )?.[0]?.stock ?? 0;

    if (
      payload?.is_stock_deducted ||
      keyword_location_stock === 0 ||
      (!product_id && payload.bonus_type != 'direct_redeem')
    ) {
      rsp.msg = 'Skip deduct stock';
    } else {
      const deductStockService = await this.stockService.deduct(
        {
          location: payload?.keyword_location_id,
          product: product_id,
          qty: 1,
          keyword: keyword_id,
          transaction_id: payload?.tracing_id || null,
          is_flashsale: payload.is_flashsale ? payload.is_flashsale : false,
        },
        payload.account,
      );

      rsp.statusCode = deductStockService?.statusCode;
      rsp.stringCode =
        deductStockService.payload['string_code'] || rsp.stringCode;
      if (deductStockService.statusCode == 200) {
        await this.loggerEligibility(
          this.loggerObject,
          `${deductStockService.message}#${rsp.stringCode}`,
          this.startTime,
          false,
          '',
        );

        payload.is_stock_deducted = true;
        rsp.msg = deductStockService.message;
        rsp.status = true;
      } else {
        await this.loggerEligibility(
          this.loggerObject,
          `${deductStockService.message}#${rsp.stringCode}`,
          this.startTime,
          true,
          '',
        );
        rsp.msg = deductStockService.message;
      }
    }

    rsp.payload = payload;
    return rsp;
  }

  private validateLocationBI(params: {
    keyword_location_type: string;
    keyword_location_id: string;
    customer_location_id: string;
    keyword_stock_location: any[];
  }): boolean {
    if (
      params.keyword_stock_location != null &&
      params.keyword_stock_location?.length === 0
    ) {
      return true;
    }

    if (!params?.keyword_location_id || !params?.customer_location_id) {
      return false;
    }

    const isValid: boolean =
      params?.keyword_location_type?.includes('HQ') ||
      params?.keyword_location_id === params?.customer_location_id;

    return isValid;
  }

  public async getCustomerLocation(
    payload: any,
    is_eligi = true,
  ): Promise<{
    timezone: string;
    customer_location_id: string;
    keyword_location_id: string;
    keyword_location_type: string;
  }> {
    const _payload = is_eligi ? this.payload : payload;

    const locationType = await this.lovService.getLovDetail(
      _payload.keyword.eligibility.location_type.toString(),
    );

    // locationType.set_value;
    let requestLocation: any;
    switch (locationType.set_value) {
      case 'Area':
        requestLocation = {
          name: payload.customer.area,
          data_source: 'LACIMA',
        };
        break;
      case 'Region':
        requestLocation = {
          area: payload.customer.area,
          name: payload.customer.region,
          data_source: 'LACIMA',
        };
        break;
      case 'City':
        requestLocation = {
          area: payload.customer.area,
          region: payload.customer.region,
          name: payload.customer.city,
          data_source: 'LACIMA',
        };
        break;
      case 'AdHoc City':
        requestLocation = {
          area: payload.customer.area,
          region: payload.customer.region,
          name: payload.customer.city,
          data_source: 'LACIMA',
        };
        break;
      case 'Head Quarter (HQ)':
        requestLocation = {
          area: payload.customer.area,
          region: payload.customer.region,
          name: payload.customer.city,
          data_source: 'LACIMA',
        };
        break;
      default:
        break;
    }

    const customer_location_city = await this.locationService.getLocationDetail(
      requestLocation,
    );

    // get location ids from keyword
    const keyword_location_ids: string[] = payload.keyword.bonus
      .filter((item) => item.bonus_type == payload.bonus_type)?.[0]
      ?.stock_location?.map((item) => item?.location_id?.toString());

    const customer_locations: {
      customer_location_id: string;
      keyword_location_id: string;
      keyword_location_type: string;
      timezone: string;
      adhoc_group: string[];
    }[] = [];

    for (let i = 0; i < keyword_location_ids?.length; i++) {
      const keyword_location_id = keyword_location_ids[i];

      const keyword_location_detail = await this.locationService.detailLocation(
        keyword_location_id,
      );

      const keyword_location_type =
        keyword_location_detail?.location_type?.set_value;

      let location_id: string = null;
      switch (keyword_location_type) {
        case 'Area':
          location_id = customer_location_city?._id;
          break;
        case 'Region':
          location_id = customer_location_city?._id;
          break;
        case 'City':
          location_id = customer_location_city?._id;
          break;
        case 'AdHoc City':
          location_id = customer_location_city?._id;
          break;
        case 'Head Quarter (HQ)':
          location_id = customer_location_city?._id;
          break;
        default:
          break;
      }

      if (keyword_location_type?.includes('HQ')) {
        location_id = keyword_location_id;
      }

      customer_locations?.push({
        customer_location_id: location_id?.toString(),
        keyword_location_id,
        keyword_location_type,
        timezone: customer_location_city?.timezone ?? 'WIB',
        adhoc_group: keyword_location_detail?.adhoc_group?.map((item) =>
          item?._id?.toString(),
        ),
      });
    }

    const customer_location = customer_locations?.filter((item) => {
      if (item.keyword_location_type == 'AdHoc City') {
        return item?.adhoc_group?.includes(item.customer_location_id);
      } else {
        const data = item.keyword_location_id == item.customer_location_id;
        return data;
      }
    })?.[0];

    if (
      customer_location != null &&
      customer_location?.keyword_location_type === 'AdHoc City'
    ) {
      customer_location.customer_location_id =
        customer_location?.keyword_location_id;
    }

    return customer_location;
  }
  async loggerEligibility(
    payload: any,
    message: any,
    start: any,
    isError: any = false,
    urlDSP: any,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    await this.exceptionHandler.handle({
      level: isError ? 'warn' : 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
        method: 'kafka',
        url: urlDSP ? `/${urlDSP}` : '/v1/redeem',
        service: 'ELIGIBILITY',
        step: urlDSP ? 'DSP' : 'eligibility',
        param: payload,
        taken_time: takenTime,
        result: {
          statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
          level: isError ? 'error' : 'verbose',
          message: message,
          trace: payload.tracing_id,
          msisdn: payload.incoming.msisdn,
          user_id: new IAccount(payload.account),
        },
      } satisfies LoggingData,
    });
  }

  async checkByCustomerTierByTselId(wallet_sibling) {
    const walletList = wallet_sibling;
    const tierKeywordList = this.keywordProfile?.segmentation_customer_tier;
    if (!tierKeywordList?.length) {
      return true;
    }
    return walletList.some(async (i) => {
      const tierId = i.tier;
      // Get Tier Local
      const getTierLocal =
        await this.customerService.getCustomerTiersByNameOrID(tierId, true);
      const tierLocalId = getTierLocal?._id?.toString();
      return tierKeywordList?.includes(tierLocalId);
    });
  }

  //*** Open :: [Fixing - Conflict] Bidder - 26-06-2024

  /**
   * This function is for validating prepaid regist
   */
  async checkByBonusTypeAucation() {
    let result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (
      this.payload.bonus_type === 'e_auction' ||
      this.payload.bonus_type === 'sms_auction'
    ) {
      const eventTime = await this.getEventTime(this.payload);
      const auction_poin_min_bidding =
        this.payload.keyword.bonus[0].auction_poin_min_bidding ?? 0;
      const aucationType =
        this.payload.keyword.bonus[0].auction_multiplier_identifier;
      const auctionMultiplierPoin =
        this.payload.keyword.bonus[0].auction_multiplier_poin ?? 0;

      const total_redeem = this.payload?.incoming?.total_redeem;

      // get top bidder
      const topBidder: any = await this.getRedisTopBidder(
        this.payload?.keyword?.eligibility?.name,
        eventTime,
      );

      // pengecekan poin type auction must Flexible
      if (this.keywordProfile.poin_value !== 'Flexible') {
        result.eligible = false;
        result.reason = 'Fail Check Aucation Type';
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_GENERAL;
        return result;
      }

      // pengecekan min bid
      const result_min_bid =
        auction_poin_min_bidding <= this.payload.incoming.total_redeem;

      if (!result_min_bid) {
        result.eligible = false;
        result.reason = 'Fail Check Poin Min Bidding';
        result.notification_group =
          NotificationTemplateConfig.NOTIFICATION_GROUP_AUC_BIDDING_FAILED_MIN_BID;
        return result;
      }

      // pengecekan kalau auction type multiplier tidak ketemu
      if (aucationType) {
        // pengecekan top bidder auction type

        if (topBidder) {
          if (total_redeem > topBidder.bid_point) {
            // fungsi current bidding
            if (aucationType === 'VALUE') {
              result = await this.aucationCurrentValue(
                auctionMultiplierPoin,
                total_redeem,
              );

              if (result.eligible === false) {
                return result;
              }
            } else {
              // last bidding point
              result = await this.aucationCurrentValue(
                topBidder.bid_point,
                total_redeem,
              );

              if (result.eligible === false) {
                return result;
              }
            }
          } else {
            result.eligible = false;
            result.reason = 'Fail Total Redeem Not Required';
            result.notification_group =
              NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_BIDDING_FAILED;
            return result;
          }
        } else {
          if (aucationType === 'VALUE') {
            // fungsi current bidding
            result = await this.aucationCurrentValue(
              auctionMultiplierPoin,
              total_redeem,
            );
            if (result.eligible === false) {
              return result;
            }
          } else {
            // last bidding point
            result = await this.aucationCurrentValue(
              total_redeem,
              total_redeem,
            );

            if (result.eligible === false) {
              return result;
            }
          }
        }
      } else {
        if (topBidder) {
          // pengecekan top bidder
          if (total_redeem <= topBidder.bid_point) {
            result.eligible = false;
            result.reason = 'Fail Total Redeem Not Required';
            result.notification_group =
              NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_BIDDING_FAILED;
            return result;
          }
        }
      }

      // save to redis
      await this.setRedisTopBidder(
        this.payload?.tracing_master_id,
        this.payload?.keyword?.eligibility?.name,
        this.payload?.keyword?.eligibility?.keyword_schedule,
        this.payload?.incoming?.msisdn,
        eventTime,
        this.payload?.incoming?.total_redeem,
      );

      // save to collection
      await this.saveBidder(
        this.payload?.tracing_master_id,
        this.payload?.keyword?.eligibility?.name,
        this.payload?.keyword?.eligibility?.keyword_schedule,
        this.payload?.incoming?.msisdn,
        eventTime,
        this.payload?.incoming?.total_redeem,
      );

      result.eligible = true;
      result.reason = '';
      result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
    }
    return result;
  }

  async saveBidder(
    transaction_id,
    keyword,
    keyword_type,
    msisdn,
    event_time,
    bid_point,
  ) {
    const data = {
      transaction_id,
      keyword,
      keyword_type,
      msisdn,
      event_time,
      bid_point,
      bid_at: moment.utc().toDate(),
    };
    const bidder = new this.bidderModel(data);
    await bidder.save();
  }

  async aucationCurrentValue(auctionMultiplierPoin: any, total_redeem: any) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    if (total_redeem % auctionMultiplierPoin === 0) {
      result.eligible = true;
      result.reason = '';
      result.notification_group = NotificationTemplateConfig.REDEEM_SUCCESS;
    } else {
      result.eligible = false;
      result.reason = 'Fail Aucation Current Value';
      result.notification_group =
        NotificationTemplateConfig.NOTIFICATION_GROUP_AUC_FAIL_POINT_MULTI;
    }

    return result;
  }

  async setRedisTopBidder(
    transaction_id,
    keyword,
    keyword_type,
    msisdn,
    event_time,
    bid_point,
    bid_time = null,
  ) {
    const key = `${RedisDataKey.AUCTION}-${keyword}_${event_time.replace(
      / /g,
      '_',
    )}`;
    const value = {
      transaction_id,
      keyword,
      keyword_type,
      msisdn,
      event_time,
      bid_point,
      bid_at: bid_time ? bid_time : moment.utc().toDate(),
    };
    await this.cacheManager.set(key, value);
  }

  async getRedisTopBidder(keyword: any, event_time: string) {
    const key = `${RedisDataKey.AUCTION}-${keyword}_${event_time.replace(
      / /g,
      '_',
    )}`;
    const topBidder = await this.cacheManager.get(key);
    return topBidder;
  }

  async getEventTime(payload) {
    let result = null;

    // check keyword type
    const keywordType = payload?.keyword?.eligibility?.keyword_schedule;
    if (keywordType === 'Daily') {
      result = payload?.keyword?.eligibility?.start_period;
    } else {
      // keywordType = 'SHIFT
      for (
        let index = 0;
        index < payload?.keyword?.eligibility?.keyword_shift.length;
        index++
      ) {
        const shift = payload?.keyword?.eligibility?.keyword_shift[index];
        if (shift.status) {
          result = shift.from;
          break;
        }
      }
    }

    return result;
  }
  //*** Close :: [Fixing - Conflict] Bidder - 26-06-2024

  /**
   * This function checks multi bonus eligibility.
   */
  async checkByMultiBonus(payload) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    /**
     * Check if the keyword is the main keyword
     * null = for keyword before multibonus
     * true = for keyword after multibonus
     */
    const is_main = payload.keyword?.is_main_keyword;
    if (is_main != false) {
      // Continue with normal eligibility check
      return result;
    } else {
      // If the keyword is not the main keyword
      if (!payload.incoming?.additional_param?.parent_transaction_id) {
        // If parent_transaction_id is null, block eligibility
        result.eligible = false;
        result.reason = 'Parent transaction ID is required for this keyword';
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_BONUS_KEYWORD; // assuming there's a failure template
      } else {
        // If parent_transaction_id exists, continue with normal eligibility check
        return result;
      }
    }

    return result;
  }
}
