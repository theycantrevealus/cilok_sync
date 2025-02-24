import {
  BadRequestException,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import * as fs from 'fs';
import { now } from 'moment';
import { extname } from 'path';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import {
  // RequestValidatorFilter
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { VoucherBatchDto } from '@/voucher/dto/voucher.batch.dto';
import { VoucherDTO, VoucherDTOResponse } from '@/voucher/dto/voucher.dto';
import { VoucherService } from '@/voucher/services/voucher.service';

@Controller('')
@ApiTags('Voucher')
@UseFilters(RequestValidatorFilterCustom)
export class VoucherController {
  constructor(
    private voucherService: VoucherService,
    @Inject('VOUCHER_SERVICE_PRODUCER')
    private readonly clientVoucherKafka: ClientKafka,
  ) {}

  @ApiOperation({
    summary: 'Voucher creation',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiConsumes('multipart/form-data')
  @Post('voucher')
  async create_voucher(
    @Req() req: FastifyRequest,
    @Param() parameter: any,
    @CredentialAccount() account,
  ) {
    const payload: VoucherDTO = new VoucherDTO(req.body);
    const files = payload.file;

    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `V_${curr_date[0]}_${time}${extname(file.filename)}`;

      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException([
          { isInvalidDataContent: 'File format not supported!' },
        ]);
      }

      fs.writeFile(
        `${__dirname}/uploads/voucher/${fileName}`,
        file.data,
        (err) => {
          if (err) {
            return console.log(err);
          }
        },
      );

      file.path = `${__dirname}/uploads/voucher/${fileName}`;

      const bodyReq = new VoucherBatchDto();
      bodyReq.locale = 'en-US';
      bodyReq.batch_no = payload.batch_no;
      bodyReq.batch_size = parseInt(String(payload.stock));
      bodyReq.type = payload.type;
      bodyReq.prefix = payload.prefix;
      bodyReq.suffix = payload.suffix;
      bodyReq.desc = payload.desc;
      bodyReq.product_name = `V+${now()}`;
      bodyReq.merchant_name = payload.merchant;
      bodyReq.start_time = payload.start_time;
      bodyReq.end_time = payload.end_time;

      const response = new VoucherDTOResponse();
      let create;

      if (payload.voucher_type == 'General' && payload.stock > 0) {
        create = await this.voucherService.addVoucherBatch(
          bodyReq,
          req.headers.authorization,
        );
      } else if (payload.voucher_type == 'Upload' && file) {
        create = await this.voucherService.addVoucherImport(
          bodyReq,
          file,
          req.headers.authorization,
        );
      } else {
        response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        response.transaction_classify = 'Voucher Creation';
        response.message = 'Voucher type not found or stock < 1';
        response.payload = {};
      }

      if (create) {
        if (create.code == 'S00000') {
          response.code = create.code;
          response.transaction_classify = 'Voucher Creation';
          response.message = 'Voucher Created Successfully';
          response.payload = {
            keyword_name: payload.keyword,
            start_period: payload.start_time,
            end_period: payload.end_time,
            program_experience: 'Lucky Draw',
            status: payload.status,
            created_at: now(),
          };

          const json = {
            transaction_classify: 'ADD_VOUCHER',
            origin: 'voucher',
            program: {},
            keyword: {},
            customer: {},
            endpoint: req.url,
            tracing_id: await response.payload['trace_id'],
            tracing_id_voucher: await response.payload['tracing_id_voucher'],
            incoming: bodyReq,
            account: account,
            submit_time: new Date().toISOString(),
            token: req.headers.authorization,
            payload: {
              voucher: response.payload,
            },
          };

          const emit = await this.clientVoucherKafka.emit('voucher', json);

          emit.subscribe((e) => {
            if (response.payload) {
              delete response.payload;
            }
          });
        } else {
          response.code = create.code;
          response.transaction_classify = 'Voucher Creation';
          response.message = 'Voucher Created Failed';
          response.payload = create.message;
        }
      }

      return response;
    }
  }
}
