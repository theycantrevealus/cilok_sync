import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isInt } from 'class-validator';
import { Model, Types } from 'mongoose';

import { CallApiConfigService } from '@/application/services/call-api-config.service';
import {
  FMC_reformatMsisdnCore,
  msisdnCombineFormatted,
  msisdnCombineFormatToId,
  validateCustomerIdentifierNumber,
} from '@/application/utils/Msisdn/formatter';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import {
  LuckyDrawUploadDetailDocument,
  LuckyDrawUploadDetailModel,
} from '@/lucky-draw/models/lucky.draw.upload.detail.model';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import {
  ViewCouponFMCParamDTO,
  ViewCouponFMCQueryDTO,
} from '@/transaction/dtos/coupon/view.coupon.list.fmc.property.dto';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';

import { CrmbRequestBodyDto } from '../../../crmb/dtos/crmb.request.body.dto';
import { MainCrmbService } from '../../../crmb/services/main.crmb.service';
import { CustomerService } from '@/customer/services/customer.service';
const moment = require('moment-timezone');

@Injectable()
export class CouponFmcService {
  private customerService: CustomerService;
  constructor(
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
    @InjectModel(LuckyDrawUploadDetailModel.name)
    private luckyDrawWinnerModel: Model<LuckyDrawUploadDetailDocument>,
    private readonly callApiConfigService: CallApiConfigService,
    private mainCrmService: MainCrmbService,
    customerService: CustomerService,
  ) {
    this.customerService = customerService;
  }

  private convertDate(date: string): Date {
    if (date == null) return null;
    const timezone = 'Asia/Jakarta';
    return moment
      .tz(moment.utc(date), timezone)
      .format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }

  private getTime(start) {
    const end = Date.now();
    return `Execution time: ${end - start} ms`;
  }

  async cuoponListv3(
    param: ViewCouponFMCParamDTO,
    query: ViewCouponFMCQueryDTO,
    token: string
  ) {
    const responseGlobal = new GlobalTransactionResponse();
    const { isValid, message } = validateCustomerIdentifierNumber(
      param.msisdn,
      query.identifier,
    );
    if (!isValid) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = message;
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }
    let custNumbers = [{msisdn:param.msisdn, ownership: "", binding_level:""}];

    if (query.identifier?.toUpperCase() == FmcIdenfitiferType.TSEL_ID) {
      try {
        const services = await this.mainCrmService.getWalletSiblingsFromCoreMember(
          param.msisdn, token
        );

        if (
          services.message !== 'Success' ||
          services.payload['members'] == undefined
        ) {
          responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          responseGlobal.message = services.message;
          responseGlobal.payload = [
            {
              trace_id: false,
            },
          ];
          return responseGlobal;
        }
        custNumbers = services.payload['members'][0]['result']
          .map((a) => {
            const msisdn = a.phone ?? ""
            const reformatMsisdn = msisdnCombineFormatToId(msisdn.split("|")[0])
            const ownership = a.ownership_flag ?? "";
            const binding_level = a.binding_level ?? "";
            return { msisdn: reformatMsisdn, ownership: ownership, binding_level: binding_level }
          })
      } catch (error: any) {
        console.log('[COUPON - CRMB LOG]');
        console.log(error);
        custNumbers = [];

        responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        responseGlobal.payload = [
          {
            trace_id: false,
          },
        ];
        responseGlobal.message = 'Member not found';

        return responseGlobal;
      }

      //const services = {
      //  responseCode: '0000',
      //  responseMessage: 'Success',
      //  transactionId: 'ESB041020192230220001',
      //  SiebelMessage: {
      //    MessageId: '',
      //    MessageType: '',
      //    IntObjectName: ' TSELSSOServicesTypeList',
      //    IntObjectFormat: 'Siebel Hierarchical',
      //    TSELSSOServicesTypeList: [
      //      {
      //        type: 'Postpaid',
      //        TSELSSOServicesList: [
      //          {
      //            serviceId: '199887766559',
      //            bindingLevel: '2',
      //            ownershipFlag: 'Owner',
      //            mainFlag: 'Y',
      //            bindDate: '20231009 22:34:24',
      //          },
      //          {
      //            serviceId: '6282276077304',
      //            bindingLevel: '1',
      //            ownershipFlag: '',
      //            mainFlag: '',
      //            bindDate: '20231009 22:34:24',
      //          },
      //        ],
      //      },
      //      {
      //        type: 'Orbit',
      //        TSELSSOServicesList: [
      //          {
      //            serviceId: '6281214558896',
      //            bindingLevel: '1',
      //            ownershipFlag: '',
      //            mainFlag: '',
      //            bindDate: '20231009 22:34:24',
      //          },
      //        ],
      //      },
      //    ],
      //  },
      //};
    }
    let reformatMsisdn = msisdnCombineFormatted(param.msisdn)
    await this.customerService
      .getCoreMemberByMsisdn(reformatMsisdn, token, '', false)
      .then(async (customerDetail) => {
        if (customerDetail) {
          const ownership = customerDetail[0]['ownership_flag'] ?? "";
          const binding_level = customerDetail[0]['binding_level'] ?? "";
          custNumbers = [{ "msisdn": param.msisdn, ownership: ownership, binding_level: binding_level }]
        }
        else {
          console.log('Customer not found for get fields ownership & binding_level')
        }
      })
      .catch((e: Error) => {
        console.log('error e2e to core ${e}')
      });

    let totalCoupon = 0;
    const s1 = Date.now();
    console.log('=== Coupon List start ===');
    console.log('| Msisdn: ', param.msisdn);

    const response = new GlobalTransactionResponse();
    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    if (query.limit < 0) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Limit Must More Than 1';
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    } else if (query.limit == 0) {
      const configLimit = await this.callApiConfigService.callConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      query.limit = configLimit ? configLimit : 5;
    }

    if (query.skip < 0) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Skip Must be a Non-Negative Number';
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }

    const skip = Number(query.skip ?? 0);
    const limit = Number(query.limit && query.limit != 0 ? query.limit : 5);

    const s2 = Date.now();

    const filter_builder: any = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    // const msisdn = FMC_reformatMsisdnCore(param.msisdn);
    // const msisdn = param.msisdn;
    const match = {
      core_type: 'Coupon',
    };

    // queryBuilder.push({
    //   $match: { msisdn: msisdn, core_type: 'Coupon' },
    // });

    queryBuilder.push({ $match: filter_builder });

    queryBuilder.push({
      $group: {
        _id: {
          program_name: '$program_name',
          keyword: '$keyword',
        },
        latestData: {
          $max: {
            $mergeObjects: [
              {
                updated_at: '$updated',
              },
              '$$ROOT',
            ],
          },
        },
        total_coupon: {
          $sum: 1,
        },
      },
    });

    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Query Builder (filter): ', this.getTime(s2));
    const s3 = Date.now();

    const facetQuery = {};
    for (let i = 0; i < custNumbers.length; i++) {
      match['msisdn'] = custNumbers[i]['msisdn'];
      facetQuery[custNumbers[i]['msisdn']] = [{ $match: { ...match } }, ...queryBuilder];
    }

    const msisdnList = custNumbers.map(res => res['msisdn'])
    const allData = await this.injectCouponModel.aggregate(
      [
        { $match: { msisdn: { $in: msisdnList }, core_type: 'Coupon' } },
        { $facet: facetQuery },
      ],
      (err, result) => {
        return result;
      },
    );

    let allDataCount = {};
    if (allData.length > 0) {
      allDataCount = allData[0];
    }

    // queryBuilder.push({ $skip: skip });
    // queryBuilder.push({ $limit: limit });
    for (let i = 0; i < custNumbers.length; i++) {
      facetQuery[custNumbers[i]['msisdn']].push({ $skip: skip });
      facetQuery[custNumbers[i]['msisdn']].push({ $limit: limit });
    }

    const coupons = await this.injectCouponModel.aggregate(
      [
        { $match: { msisdn: { $in: msisdnList }, core_type: 'Coupon' } },
        { $facet: facetQuery },
      ],
      (err, result) => {
        return result;
      },
    );

    console.log('| Query:', this.getTime(s3));
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const s4 = Date.now();
    const responsePayload = [];
    if (coupons.length > 0) {
      for (let i = 0; i < custNumbers.length; i++) {
        const itemData = coupons[0][custNumbers[i]['msisdn']];
        const dataCount = allDataCount[custNumbers[i]['msisdn']].length;

        // console.log(itemData);
        const couponsDetail = await Promise.all(
          itemData.map(async (coupon) => {
            totalCoupon += coupon?.total_coupon ?? 0;

            // setup winner
            const luckyDrawWinner = await this.luckyDrawWinnerModel.find({
              keyword: coupon?.latestData?.keyword,
            });

            let statusWinner = 0;
            let listWinner = [];

            if (luckyDrawWinner.length > 0) {
              const winner = luckyDrawWinner.find(
                (item) => item.msisdn === coupon?.latestData?.msisdn,
              );

              statusWinner = winner ? 1 : 2;
              listWinner = winner
                ? [
                    {
                      prize_name: winner.prize,
                      msisdn: winner.msisdn,
                      coupon: coupon?.total_coupon || 0,
                    },
                  ]
                : [];
            }

            return {
              program_id: coupon?.latestData?.program_id || null,
              program_name: coupon?.latestData?.program_name || null,
              program_start:
                this.convertDate(coupon?.latestData?.program_start) || null,
              program_end:
                this.convertDate(coupon?.latestData?.program_end) || null,
              keyword: coupon?.latestData?.keyword || null,
              total_coupon: coupon?.total_coupon || 0,
              status_winner: statusWinner,
              list_of_winner: listWinner,
            };
          }),
        );

        responsePayload.push({
          msisdn: custNumbers[i]['msisdn'],
          ownership: custNumbers[i]['ownership'],
          binding_level: custNumbers[i]['binding_level'],
          total_record: dataCount,
          // total_coupon: totalCoupon,
          page_size: Math.ceil(dataCount / limit),
          page_number: Math.floor(skip / limit + 1),
          list_of_coupon: couponsDetail,
        });
      }
    }

    // const page_size = newTotalData / limit;
    response.payload = responsePayload;

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Coupon List End ===');

    return response;
  }

  paginate(array, page_size, page_number) {
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
  }
}
