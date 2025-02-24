import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { SetConfigDTOResponse } from '@/application/dto/set.config.dto';
import { E2ebiClassifyEnum } from '@/e2ebi/constans/e2e.classify.enum';
import { PoineventAddDTO } from '@/e2ebi/dtos/poinevent.dto';
import { ConfigIntegration } from '@/e2ebi/integration/config.integration';
import { Poinevent, PoineventDocument } from '@/e2ebi/models/poinevent.model';

@Injectable()
export class PoineventIntegration extends ConfigIntegration {
  constructor(
    @InjectModel(Poinevent.name)
    private poineventModel: Model<PoineventDocument>,
    httpService: HttpService,
    configService: ConfigService,
  ) {
    super(httpService, configService);
    this.initHttpService();
  }

  async post(payload: PoineventAddDTO): Promise<SetConfigDTOResponse> {
    const response = new SetConfigDTOResponse();
    const transactionClassify = E2ebiClassifyEnum.poinevent;
    return await lastValueFrom(
      this.getHttpService()
        .post('/poinevent', payload, {
          headers: this.getHeader(),
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            if (data.code.equals('S00000')) {
              const poineventStore = new this.poineventModel(payload);
              const process = poineventStore.save().then(async (returning) => {
                return returning;
              });
              if (process) {
                response.message = 'Integrate Poinevent Created Successfully';
                response.status = HttpStatus.OK;
                response.transaction_classify = transactionClassify;
                response.payload = poineventStore;
              } else {
                response.message = 'Integrate Poinevent Failed to Created';
                response.status = 400;
                response.transaction_classify = transactionClassify;
                response.payload = payload;
              }
              return response;
            }
            response.status = res.status;
            response.message = data?.message;
            response.transaction_classify = transactionClassify;
            response.payload = res.data;
            return response;
          }),
          catchError(async (err: any) => {
            if (err.code !== 'ENOTFOUND') {
              const status = err.response.status;
              // throwError(() => new HttpException(err.response.data, status));
              response.status = status;
              response.message = err.data?.message;
              response.transaction_classify = transactionClassify;
              response.payload = err.data;
              console.log(response);
              return response;
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }
}
