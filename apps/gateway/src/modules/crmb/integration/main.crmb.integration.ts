import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { CrmbClassifyEnum } from '@/crmb/constans/crmb.classify.enum';
import { CrmbRequestBodyDto } from '@/crmb/dtos/crmb.request.body.dto';
import { CrmbResponseDTO } from '@/crmb/dtos/crmb.response.dto';

import { CrmbConfig } from './crmb.config';
import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';

const errorResponseMessage: { status: number; message: string }[] = [];

@Injectable()
export class MainCrmbIntegration extends CrmbConfig {
  constructor(
    httpService: HttpService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    super(httpService, configService);
    this.initHttpService();
  }

  async getTselIdBindingsGrouped(
    requestBody: CrmbRequestBodyDto,
  ): Promise<CrmbResponseDTO> {
    requestBody.intRef = 'SSOGetTselIdBindingsGrouped';
    console.log('request body', requestBody);
    const response = new CrmbResponseDTO();
    return await lastValueFrom(
      this.getHttpService()
        .post(
          'SSOGetTselIdBindingsGrouped',
          {
            body: requestBody,
          },
          this.getRequestOption(),
        )
        .pipe(
          map(async (res) => {
            const result = res.data;
            response.status = res.status;
            response.message = result.responseMessage;
            response.transaction_classify =
              CrmbClassifyEnum.getTselIdBindingsGroupedSuccess;
            response.payload = result.SiebelMessage;
            response.code = result.responseCode;
            return response;
          }),
          catchError(async (err: any) => {
            const result = err.response.data;
            if (err.code !== 'ENOTFOUND') {
              throwError(
                () => new HttpException(err.response.data, err.response.status),
              );
              response.status = err.response?.status;
              response.message = result?.responseMessage;
              response.transaction_classify =
                CrmbClassifyEnum.getTselIdBindingsGroupedFail;
              return response;
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }

  // To be implement
  async getWalletSiblingsFromCoreMember(
    tselId: string,
    token: string,
  ): Promise<any> {
    const merchant_id = this.configService.get<string>(
      'core-backend.merchant.id',
    );
    return await lastValueFrom(
      this.getHttpService()
        .get(
          `/members?customer_type=Member&addon={"wallet":1,"tsel_id":1,"binding_level":1,"ownership_flag":1}&merchant_id=${merchant_id}&filter={"tsel_id":"${tselId}"}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'No-Cache',
              Authorization: token,
            },
          },
        )
        .pipe(
          map(async (res: any) => {
            if (res?.data?.payload?.members[0]?.result) {
              return {
                code: res?.data?.code,
                message: 'Success',
                payload: res?.data?.payload,
              };
            }
            return {
              code: HttpCodeTransaction.ERR_CUSTOMER_TYPE_400,
              message: 'Member not found',
              payload: [
                {
                  trace_id: false,
                },
              ]
            };

          }),
          catchError(async (err: any) => {
            const responseDataError = err.response.data;
            return {
              message: HttpStatus.FOUND,
              payload: responseDataError,
            };
          }),
        ),
    );
  }
  async getWalletSiblings(tselId: string): Promise<CrmbResponseDTO> {
    const dummy_data = {
      code: 'S00000',
      message: 'Success',
      payload: {
        members: [
          {
            total: [
              {
                count: 2,
              },
            ],
            result: [
              {
                id: 'member-663dca951faccf1c4f5a725a',
                type: 'Member',
                code: 'DXNR-0788',
                firstname: 'sarah',
                lastname: 'ratna',
                nickname: 'puri',
                gender: 'Female',
                phone: '081385968264|ID|+62',
                email: 'testpro@gmail.com',
                i18n: {
                  'en-US': {
                    firstname: 'sarah',
                    lastname: 'P',
                    nickname: 'sarah',
                  },
                },
                status: 'Active',
                __v: 0,
                tier_id: 'tier-625f956f9e927dcf1339dcc8',
                last_earn_time: '2024-05-13T04:37:29.113Z',
                last_redeem_time: '2024-05-13T04:47:25.777Z',
                tier: {
                  current: {
                    id: 'tier-625f956f9e927dcf1339dcc8',
                    name: 'Silver',
                  },
                },
                ownership_flag: 'Owner',
                binding_level: 2,
                wallet: {
                  _id: '663dcab9a4cddc027eb7dc8e',
                  __v: 20,
                  doctype: 'docwallet',
                  member_id: 'member-663dca951faccf1c4f5a725a',
                  merchant_id: 'mercht-621edf16bf9fa6033d92bfeb',
                  agent: 'axios/1.5.0',
                  branch_id: 'mbrnch-621edf16bf9fa6033d92bfeb',
                  client_ip: '127.0.0.1',
                  create_by_id: 'user-63468d33f9f42254b44cbec0',
                  create_time: '2024-05-10T07:20:25.010Z',
                  expiring_time: ['2024-12-31T16:59:59.999Z'],
                  id: 'cwallt-663dcab91faccf1c4f5a725e',
                  pocket: {
                    reward: {
                      available: 98,
                      'rwditm-621edf16bf9fa6033d93bfeb': {
                        '1735664399999': {
                          amount: 98,
                          expire_time: '2024-12-31T16:59:59.999Z',
                          reward_instance_id: 'rwdins-621edf16bf9fa6033d92bfeb',
                        },
                        available: 98,
                        total: 98,
                      },
                      total: 98,
                    },
                  },
                  realm_id: 'realm-621edf16bf9fa6033d92bfeb',
                  status: 'Active',
                  update_by_id: 'user-63468d33f9f42254b44cbec0',
                  update_time: '2024-05-13T04:47:25.770Z',
                },
                lifetime_value: {
                  duration: 10031729,
                  remaining_reward: 98,
                  total_transaction: 0,
                  total_revenue: 0,
                  total_outstanding: 0,
                  total_qty: 0,
                  total_reward: null,
                },
                last_transaction_time: '2024-05-13T04:47:25.781Z',
              },
              {
                id: 'member-663dca951faccf1c4f5a725a',
                type: 'Member',
                code: 'DXNR-0788',
                firstname: 'sarah',
                lastname: 'ratna',
                nickname: 'puri',
                gender: 'Female',
                phone: '081385968264|ID|+62',
                email: 'testpro@gmail.com',
                i18n: {
                  'en-US': {
                    firstname: 'sarah',
                    lastname: 'P',
                    nickname: 'sarah',
                  },
                },
                status: 'Active',
                __v: 0,
                tier_id: 'tier-625f956f9e927dcf1339dcc8',
                last_earn_time: '2024-05-13T04:37:29.113Z',
                last_redeem_time: '2024-05-13T04:47:25.777Z',
                tier: {
                  current: {
                    id: 'tier-625f956f9e927dcf1339dcc8',
                    name: 'Silver',
                  },
                },
                ownership_flag: 'Co-Owner',
                binding_level: 1,
                wallet: {
                  _id: '663dcab9a4cddc027eb7dc8e',
                  __v: 20,
                  doctype: 'docwallet',
                  member_id: 'member-663dca951faccf1c4f5a725a',
                  merchant_id: 'mercht-621edf16bf9fa6033d92bfeb',
                  agent: 'axios/1.5.0',
                  branch_id: 'mbrnch-621edf16bf9fa6033d92bfeb',
                  client_ip: '127.0.0.1',
                  create_by_id: 'user-63468d33f9f42254b44cbec0',
                  create_time: '2024-05-10T07:20:25.010Z',
                  expiring_time: ['2024-12-31T16:59:59.999Z'],
                  id: 'cwallt-663dcab91faccf1c4f5a725e',
                  pocket: {
                    reward: {
                      available: 98,
                      'rwditm-621edf16bf9fa6033d93bfeb': {
                        '1735664399999': {
                          amount: 98,
                          expire_time: '2024-12-31T16:59:59.999Z',
                          reward_instance_id: 'rwdins-621edf16bf9fa6033d92bfeb',
                        },
                        available: 98,
                        total: 98,
                      },
                      total: 98,
                    },
                  },
                  realm_id: 'realm-621edf16bf9fa6033d92bfeb',
                  status: 'Active',
                  update_by_id: 'user-63468d33f9f42254b44cbec0',
                  update_time: '2024-05-13T04:47:25.770Z',
                },
                lifetime_value: {
                  duration: 10031729,
                  remaining_reward: 98,
                  total_transaction: 0,
                  total_revenue: 0,
                  total_outstanding: 0,
                  total_qty: 0,
                  total_reward: null,
                },
                last_transaction_time: '2024-05-13T04:47:25.781Z',
              },
            ],
          },
        ],
      },
    };
    const response = new CrmbResponseDTO();
    response.status = 200;
    (response.message = dummy_data.message),
      (response.transaction_classify =
        CrmbClassifyEnum.getTselIdBindingsGroupedSuccess);
    response.payload = dummy_data.payload;
    response.code = dummy_data.code;
    return response;
  }
}
