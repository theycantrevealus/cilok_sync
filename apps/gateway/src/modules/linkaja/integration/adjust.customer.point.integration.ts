import {HttpService} from "@nestjs/axios"
import {ConfigService} from "@nestjs/config"
import {catchError, lastValueFrom, map, throwError} from 'rxjs'
import {BadRequestException, HttpException, HttpStatus, Injectable, Logger} from "@nestjs/common"
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto"
import {LinkAjaConfig} from "@/linkaja/integration/link.aja.config"
import {LinkAjaClassifyEnum} from "@/linkaja/constans/link.aja.classify.enum"
import {LinkAjaDisbursementDTOResponse} from "@/linkaja/dtos/get.token.dto"
import {AdjustCustomerPointDTOResponse} from "@/linkaja/dtos/adjust.customer.point.dto";
import {InjectModel} from "@nestjs/mongoose";
import {Customer, CustomerDocument} from "@/customer/models/customer.model";
import {Model} from "mongoose";
import {AdjustCustomerPoint} from "@/linkaja/models/adjust.customer.point.model";

@Injectable()
export class AdjustCustomerPointIntegration extends LinkAjaConfig {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @InjectModel(AdjustCustomerPoint.name)
    private adjustCustomerPointModel: Model<CustomerDocument>,
  ) {
    super(httpService, configService)
    this.initHttpService()
  }

  async post(payload: any, endpoint: string): Promise<AdjustCustomerPointDTOResponse> {
    const transactionClassify = LinkAjaClassifyEnum.adjustCustomerPointBalance
    const adjustCustomerPointResponse = new AdjustCustomerPointDTOResponse()
    return await lastValueFrom(
      this.getHttpService()
        .post(endpoint, payload,
          {
            headers: this.getHeader('POST', endpoint, payload)
          })
        .pipe(
          map(async (res) => {
              const data = res.data
              if (data.status.equals('00')) {
                const memberNew = new this.adjustCustomerPointModel(payload);
                const process = memberNew.save().then(async (returning) => {
                  return returning;
                });
                if (!process) {
                  adjustCustomerPointResponse.status = res.status
                  adjustCustomerPointResponse.trxid = data?.trxid
                  adjustCustomerPointResponse.message = 'Adjust Customer Point Failed to Created';
                  adjustCustomerPointResponse.procTime = data?.procTime
                  adjustCustomerPointResponse.transaction_classify = transactionClassify
                  adjustCustomerPointResponse.status = 400;
                  adjustCustomerPointResponse.payload = payload;
                }
                adjustCustomerPointResponse.status = res.status
                adjustCustomerPointResponse.trxid = data?.trxid
                adjustCustomerPointResponse.message = data?.message
                adjustCustomerPointResponse.procTime = data?.procTime
                adjustCustomerPointResponse.transaction_classify = transactionClassify
                adjustCustomerPointResponse.payload = res.data
                return adjustCustomerPointResponse
              }
              adjustCustomerPointResponse.status = res.status
              adjustCustomerPointResponse.trxid = data?.trxid
              adjustCustomerPointResponse.message = data?.message
              adjustCustomerPointResponse.procTime = data?.procTime
              adjustCustomerPointResponse.transaction_classify = transactionClassify
              adjustCustomerPointResponse.payload = res.data
              return adjustCustomerPointResponse
            }
          ),
          catchError(async (err: any) => {
            if (err.code !== "ENOTFOUND") {
              const status = err.response.status
              throwError(
                () => new HttpException(err.response.data, status),
              )
              adjustCustomerPointResponse.status = status
              adjustCustomerPointResponse.message = err.data?.message
              adjustCustomerPointResponse.transaction_classify = transactionClassify
              adjustCustomerPointResponse.payload = err.data
              return adjustCustomerPointResponse
            } else {
              throw new BadRequestException([err.message])
            }
          }),
        )
    )
  }
}
