import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Error, Model } from 'mongoose';

import { Account } from '@/account/models/account.model';
import {
  allowedIndihomeNumber,
  allowedMSISDN,
  allowedTselID,
  checkCustomerIdentifier,
  FMC_allowedMSISDN,
  formatMsisdnCore,
  formatMsisdnToID,
  ssoFormatToId,
} from '@/application/utils/Msisdn/formatter';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import {
  ProgramTemplist,
  ProgramTemplistDocument,
} from '@/program/models/program.templist.model';
import {
  WhitelistCounterParamDTO,
  WhitelistCounterQueryDTO,
} from '@/transaction/dtos/whitelist/whitelist.dto';
import {
  InjectWhitelist,
  InjectWhitelistDocument,
} from '@/transaction/models/whitelist/inject.whitelist.model';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectModel(InjectWhitelist.name)
    private injectWhitelistModel: Model<InjectWhitelistDocument>,
    @InjectModel(ProgramV2.name)
    private programModel: Model<ProgramV2Document>,
    @InjectModel(ProgramTemplist.name)
    private programTempListModel: Model<ProgramTemplistDocument>,
  ) {
    //
  }

  /**
   * Inject whitelist
   * @param request
   * @param account
   */
  async whitelist_inject(
    request: InjectWhitelist,
    account: Account,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    if (!FMC_allowedMSISDN(request.msisdn)) {
      response.code = HttpStatusTransaction.ERR_PHONE_INVALID;
      response.message = 'Wrong Service Number Format';
      response.transaction_classify = 'WHITELIST_INJECT';
      return response;
    }

    // NOTE : TselID won't be added to progtemplist if whitelist counter is set
    // if (request.tsel_id && !allowedTselID(request.tsel_id)) {
    //   response.code = HttpStatusTransaction.ERR_PHONE_INVALID;
    //   response.message = 'Wrong TselID Format';
    //   response.transaction_classify = 'WHITELIST_INJECT';
    //   return response;
    // }

    let identifier = 'msisdn'; // Default msisdn (Tere have no identifier)
    request.msisdn = ssoFormatToId(request.msisdn);
    if (allowedMSISDN(request.msisdn)) {
      identifier = 'msisdn';
    } else if (allowedIndihomeNumber(request.msisdn)) {
      identifier = 'indihome';
    }

    // BAU LOGIC
    // check if msisdn not allowed
    // if (!allowedMSISDN(request.msisdn)) {
    //   response.code = HttpStatusTransaction.ERR_PHONE_INVALID;
    //   response.message = 'Wrong Msisdn Format';
    //   response.transaction_classify = 'WHITELIST_INJECT';
    //   return response;
    // }

    // convert msisdn
    // request.msisdn = formatMsisdnToID(request.msisdn);

    // todo, use eligibility check for check program (refactor later)
    const query = ObjectId.isValid(request?.program_id?.toString())
      ? { _id: new ObjectId(request?.program_id?.toString()) }
      : { name: request?.program_id };
    return await this.programModel.findOne(query).then(async (programRes) => {
      // check if program not exists
      if (!programRes) {
        throw new BadRequestException([
          { isUnregisteredProgram: 'Program Not Found' },
        ]);
      }

      // set programTemplistData
      const tempData = {
        msisdn: request.msisdn,
        program: new ObjectId(programRes.id.toString()),
        type: 'whitelist',
        identifier: identifier,
        match: true,
      };

      // cek apakah dengan counter?
      let with_counter = request?.with_counter;
      if (!with_counter) {
        with_counter = programRes.whitelist_counter;
      }

      // log
      console.log('==== WHITELIST INJECT ====');
      console.log(
        'DATA : ',
        JSON.stringify({
          msisdn: request.msisdn,
          identifier: identifier,
          program: new ObjectId(programRes.id.toString()), // request.program_id,
          keyword: request.keyword,
        }),
      );
      console.log('WITH COUNTER : ', with_counter);
      console.log('==== WHITELIST INJECT ====');

      // check in templist
      return await this.programTempListModel
        .findOne(tempData)
        .then(async (tempListData) => {
          const newData = new this.injectWhitelistModel({
            ...request,
            created_by: account,
          });

          if (tempListData) {
            // add 1 in counter if already available & with_counter is true
            if (with_counter) {
              tempListData.counter += 1;
            }

            return await tempListData
              .save()
              .catch((e: Error) => {
                throw new Error(e.message);
              })
              .then(async () => {
                return await this.saveTransaction(newData, response);
              });
          } else {
            if (!with_counter) {
              tempData['counter'] = 0; // set 0 for counter for first time insert (counter = false)
            } else {
              tempData['counter'] = 1; // set 1 for counter for first time insert ( counter = true)
            }

            const newTempList = new this.programTempListModel(tempData);
            return await newTempList
              .save()
              .catch((e: Error) => {
                throw new Error(e.message);
              })
              .then(async () => {
                return await this.saveTransaction(newData, response);
              });
          }
        })
        .catch((e: Error) => {
          throw new Error(e.message);
        });
      // })
      // .catch((e: Error) => {
      //   throw new Error(e.message);
    });
  }

  async whitelist_counter(
    param: WhitelistCounterParamDTO,
    query: WhitelistCounterQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    const querySet = ObjectId.isValid(query?.program_id?.toString())
      ? { _id: new ObjectId(query?.program_id?.toString()) }
      : { name: query?.program_id };
    return await this.programModel
      .findOne(querySet)

      .then(async (programRes) => {
        if (programRes) {
          return await this.programTempListModel
            .findOne({
              $and: [
                {
                  program: new ObjectId(programRes._id.toString()),
                },
                {
                  $or: [
                    { msisdn: param.msisdn },
                    { msisdn: formatMsisdnCore(param.msisdn) },
                  ],
                },
              ],
            })
            .then(async (tempListData) => {
              if (tempListData) {
                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.payload = {
                  program_id: programRes.name,
                  program_name: programRes.desc,
                  msisdn: param.msisdn,
                  counter: tempListData.counter,
                };
              } else {
                response.code = HttpStatusTransaction.ERR_NOT_FOUND;
                response.message = 'Data not found';
                response.payload = {};
              }
              return response;
            });
        } else {
          throw new BadRequestException([
            { isUnregisteredProgram: 'Program Not Found' },
          ]);
        }
      });
  }

  /**
   * For save in collection transaction_inject_whitelist
   * @param data
   * @param response
   */
  async saveTransaction(
    data: InjectWhitelistDocument,
    response: GlobalTransactionResponse,
  ): Promise<GlobalTransactionResponse> {
    const newData = new this.injectWhitelistModel(data);
    return await newData
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = 'WHITELIST_INJECT';
        response.trace_custom_code = 'PGCR';
        response.payload = {
          trace_id: true,
        };
        return response;
      });
  }

  /**
   * For check if redeemed keyword has multiwhitelist value, then add redeemer msisdn to whitelist for selected program
   * @param payload
   */
  async check_and_add_multiwhitelist(payload, trx_id) {
    // const program = payload['program'];
    const keyword = payload['keyword'];
    const keyword_eligi = keyword.eligibility;

    if (keyword_eligi.multiwhitelist) {
      if (keyword_eligi.multiwhitelist_program.length) {
        // terpantau ada multiwhitelist nya
        // inject
        for (let i = 0; i < keyword_eligi.multiwhitelist_program.length; i++) {
          const programId = keyword_eligi.multiwhitelist_program[i];
          const programName = await this.programModel
            .findOne({ _id: programId })
            .exec();

          // console.log('PROG SRC: ', program.whitelist_counter);
          // console.log('PROG DST: ', programName.whitelist_counter);

          try {
            await this.whitelist_inject(
              {
                locale: 'id-ID',
                msisdn: payload.customer.msisdn,
                tsel_id: payload?.incoming?.tsel_id,
                program_id: programName.name,
                keyword: payload.keyword.eligibility.name,
                with_counter: programName.whitelist_counter, // with_counter: true or false, from program
                transaction_id: trx_id,
                channel_id: null,
                additional_param: null,
                created_at: new Date(),
                created_by: payload.account,
                updated_at: new Date(),
                deleted_at: null,
              },
              payload.account,
            );
          } catch (error) {
            console.error('ERROR INJECT WHITELIST: ', error);
          }
        }

        return true;
      }
    }

    return false;
  }

  async modifyCounter(
    program: string,
    keyword: string,
    msisdn: string,
    add?: boolean,
  ) {
    return await this.programTempListModel
      .findOne({
        msisdn: formatMsisdnToID(msisdn),
        program: new ObjectId(program),
      })
      .then(async (wldata) => {
        if (wldata) {
          if (add) wldata.counter += 1;
          else wldata.counter -= 1;

          return await wldata
            .save()
            .catch((e: Error) => {
              throw new Error(e.message);
            })
            .then(async () => {
              return true;
            });
        } else {
          return false;
        }
      });
  }

  async addCounter(program: string, keyword: string, msisdn: string) {
    return await this.modifyCounter(program, keyword, msisdn, true);
  }

  async reduceCounter(program: string, keyword: string, msisdn: string) {
    return await this.modifyCounter(program, keyword, msisdn, false);
  }
}
