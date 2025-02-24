import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import * as fs from 'fs';
import { extname } from 'path';

import { AccountService } from '@/account/services/account.service';
import { Authorization } from '@/decorators/auth.decorator';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { VoucherUploadFileDTO } from '@/transaction/dtos/voucher/voucher.upload.dto';
import { VoucherUploadService } from '@/transaction/services/voucher/voucher.upload.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class VoucherUploadController {
  constructor(
    private vcrService: VoucherUploadService,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {
    //
  }

  // Voucher Upload File
  @ApiOperation({
    summary: 'Voucher Upload File',
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
  @Version('1')
  @Post('voucher/upload')
  async voucher_upload(@Req() req: FastifyRequest) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });

    const payload: VoucherUploadFileDTO = new VoucherUploadFileDTO(req.body);
    const files = payload.file;

    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `V_${curr_date[0]}_${time}${extname(file.filename)}`;

      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException([
          { isInvalidDataContent: 'File format not support' },
        ]);
      }

      fs.writeFile(`./uploads/voucher/${fileName}`, file.data, (err) => {
        if (err) {
          return console.log(err);
        }
      });

      file.path = `./uploads/voucher/${fileName}`;
      // file.path = `${__dirname}/uploads/voucher/${fileName}`;

      payload.file = {
        mimetype: file.mimetype,
        filename: fileName,
        path: file.path,
        // base64: Buffer.from(file.data).toString('base64'),
      };

      return await this.vcrService
        .voucherUploadFile(req, accountSet, payload)
        .then((e) => {
          return e;
        })
        .catch((e) => {
          return e;
        });
    }
  }

  @ApiOperation({
    summary: 'Voucher Upload File',
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
  @Version('2')
  @Post('voucher/upload')
  async voucher_uploadv2(@Req() req: FastifyRequest) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });

    const payload: VoucherUploadFileDTO = new VoucherUploadFileDTO(req.body);
    const files = payload.file;

    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `V_${curr_date[0]}_${time}${extname(file.filename)}`;

      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException([
          { isInvalidDataContent: 'File format not support' },
        ]);
      }

      fs.writeFile(`./uploads/voucher/${fileName}`, file.data, (err) => {
        if (err) {
          return console.log(err);
        }
      });

      file.path = `./uploads/voucher/${fileName}`;
      // file.path = `${__dirname}/uploads/voucher/${fileName}`;

      payload.file = {
        mimetype: file.mimetype,
        original_filename: file.filename,
        filename: fileName,
        path: file.path,
        // base64: Buffer.from(file.data).toString('base64'),
      };

      return await this.vcrService
        .voucherUploadFile(req, accountSet, payload, true)
        .then((e) => {
          return e;
        })
        .catch((e) => {
          return e;
        });
    }
  }
}
