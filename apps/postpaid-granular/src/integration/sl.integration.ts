import {HttpService} from "@nestjs/axios"
import {ConfigService} from "@nestjs/config"
import {catchError, lastValueFrom, map, throwError} from 'rxjs'
import {BadRequestException, HttpException, Injectable} from "@nestjs/common"
  ;
import {SlConfig} from "./sl.config";
import {AccountLoginDTO} from "@/oauth/dto/login.dto";
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto";

const errorResponseMessage: { status: number; message: string }[] = []

@Injectable()
export class SlIntegration extends SlConfig {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
  ) {
    super(httpService, configService)
    this.initHttpService()
  }

  async post(payload: any, endpoint: string, token?: string): Promise<SetConfigDTOResponse> {
    const response = new SetConfigDTOResponse()
    return await lastValueFrom(
      this.getHttpService()
        .post(endpoint, payload,
          {
            headers: (token) ? {
              ...this.getHeader(),
              'Access-Token': token
            } : this.getHeader()
          },
        )
        .pipe(
          map(async (res) => {
            console.log(res)
            const result = res.data
            response.status = res.status
            response.message = result.message
            response.payload = result.data
            return response
          }),
          catchError(async (err: any) => {
            console.log(err)
            if (err.code !== "ENOTFOUND") {
              const status = err.response.status
              throwError(
                () => new HttpException(err.response.data, status),
              )
              response.status = status
              response.message = err.data?.message
              response.payload = err.data
              return response
            } else {
              throw new BadRequestException([err.message])
            }
          }),
        )
    )
  }

  async get(endpoint: string, token: string): Promise<SetConfigDTOResponse> {
    const response = new SetConfigDTOResponse()
    return await lastValueFrom(
      this.getHttpService()
        .get(endpoint,
          {
            headers: {
              ...this.getHeader(),
              'Access-Token': token
            }
          },
        )
        .pipe(
          map(async (res) => {
            const result = res.data
            response.status = res.status
            response.message = result.message
            response.payload = result.data
            return response
          }),
          catchError(async (err: any) => {
            if (err.code !== "ENOTFOUND") {
              const status = err.response.status
              throwError(
                () => new HttpException(err.response.data, status),
              )
              response.status = status
              response.message = err.data?.message
              response.payload = err.data
              return response
            } else {
              throw new BadRequestException([err.message])
            }
          }),
        )
    )
  }
}
