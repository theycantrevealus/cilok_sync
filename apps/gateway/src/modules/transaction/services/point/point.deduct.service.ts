import { BadRequestException, Injectable } from "@nestjs/common";
import { PointService } from "./point.service";
import { Account } from "@/account/models/account.model";
import { GlobalTransactionResponse } from "@/dtos/response.transaction.dto";
import { HttpStatusTransaction } from "@/dtos/http.status.transaction.dto";
import { DeductPoint } from "@/transaction/models/point/deduct.point.model";
import { msisdnCombineFormatted } from "@/application/utils/Msisdn/formatter";

@Injectable()
export class PointDeductService extends PointService {

  /**
   * 
   * @param request 
   * @param account 
   * @param req 
   * @returns 
   */
  async prepareDeductPoint(
    payload: {
      request: DeductPoint,
      account: Account,
      token: string,
      endpoint: string,
      trace_id: string
    }
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'DEDUCT';
    response.trace_custom_code = 'TRX';

    const { request, account, token, endpoint, trace_id } = payload;

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    // const trace_id = this.transactionOptional.getTracingId(request, response);

    // const count = await this.checkTraceIDDeductPoint(trace_id);
    // if (count == 0) {
    return await this.getSelectedData(request, token, {
      check_balance: true,
    })
      .then(async (value: any) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';

        // create remark
        const _eligibility = value?.keyword?.eligibility;

        let program_experience = '';
        const _program_experience = _eligibility?.program_experience.toString();
        if (_program_experience) {
          try {
            const lov = await this.lovService.getLovData(_program_experience);
            program_experience = lov.set_value;
          } catch (error) {
            console.log('==== PREPARE PAYLOAD ======');
            console.log('get program_experience not found');
            console.log('program_experience ', _program_experience);
            console.log(error);
            console.log('==== PREPARE PAYLOAD ======');
          }
        }

        const remark = [
          _eligibility?.program_title_expose
            ? _eligibility?.program_title_expose
            : '',
          _eligibility.name,
          _eligibility?.program_experience
            ? program_experience
              ? program_experience
              : ''
            : '',
        ].join('|');

        // create channel_id
        const channel_id = request.channel_id ? request.channel_id : '';

        const coreRequest = {
          locale: request.locale, //"id-ID"
          type: 'reward',
          channel: channel_id,
          transaction_no: trace_id,
          reward_item_id: value?.reward_item_id,
          reward_instance_id: value?.reward_instance_id,
          amount: request.total_point,
          remark: remark,
          member_id: value?.member_id,
          realm_id: this.realm,
          branch_id: this.branch,
          merchant_id: this.merchant,
          __v: value.__v,
        };

        const json = {
          transaction_classify: 'DEDUCT_POINT',
          origin: 'deduct',
          program: value.program,
          keyword: value.keyword,
          customer: value.customer,
          endpoint: endpoint,
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          incoming: request,
          account: account,
          retry: {
            deduct: {
              counter: 0,
              errors: [],
            },
          },
          rule: {
            fixed_multiple: {
              counter: 0,
              counter_fail: 0,
              counter_success: 0,
              message: [],
              status: [],
              transactions: [],
            },
          },
          submit_time: new Date().toISOString(),
          token: token,
          payload: {
            deduct: coreRequest,
          },
        };

        response.payload = {
          trace_id: trace_id,
          core: coreRequest,
          keyword: value.keyword,
          program: value.program,
          customer: value.customer,
          payload: json,
        };

        return response;
      })
      .catch((e) => {
        const http_status = e.http_status
          ? e.http_status
          : 'isInvalidDataContent';

        this.save_to_logger({
          statusStringCode: e?.code,
          step: 'Prepare payload for deduct',
          payload: {
            origin: 'deduct.deduct_fail',
            endpoint: '/v2/point/deduct',
            incoming: request,
            tracing_master_id: trace_id ?? '-',
          },
          message: e?.msg_error_system,
          method: 'POST',
          service: 'DEDUCT_SYNC',
          is_success: false,
        });

        throw new BadRequestException([
          { [http_status]: e.message, trace_id: trace_id },
        ]);
      });
  }

  /**
   * 
   * @param request DeductPoint
   * @param account Account Profile
   * @param req request data for gateway
   * @returns 
   */
  async processDeductPointGateway(request: any, account: Account, req: any) {
    const response = new GlobalTransactionResponse();

    response.transaction_classify = 'DEDUCT_POINT';
    response.trace_custom_code = 'TRX';

    request.channel_id = request?.channel_id
      ? request?.channel_id.toUpperCase()
      : '';
    const channel_id = request?.channel_id;
    console.log('channel id coupon ', channel_id);

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    try {
      response.payload = {
        trace_id: trace_id,
      };

      const json = {
        transaction_classify: 'DEDUCT_POINT',
        origin: 'deduct_gateway',
        program: null, // response.payload['program'],
        keyword: null, // response.payload['keyword'],
        customer: null, // response.payload['customer'],
        tracing_id: trace_id,
        tracing_master_id: trace_id,
        incoming: request,
        account: account,
        endpoint: req.url,
        retry: {
          inject_point: {
            counter: 0,
            errors: [],
          },
        },
        rule: {
          fixed_multiple: {
            counter: 0,
            counter_fail: 0,
            counter_success: 0,
            message: [],
            status: [],
            transactions: [],
          },
        },
        submit_time: new Date().toISOString(),
        token: req.headers.authorization,
        payload: {
          deduct: null, // response.payload['core'],
        },
      };

      // emit payload kosong ke inject_point
      this.clientInjectKafka.emit(process.env.KAFKA_DEDUCT_TOPIC, json);

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      response.payload['json'] = json;

      return response;
    } catch (err) {
      response.code = err?.code
        ? err?.code
        : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = err?.message;
      response.payload = {
        trace_id: trace_id,
      };

      return response;
    }
  }
}
