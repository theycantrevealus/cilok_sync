import {
  BadRequestException,
  Body,
  CacheInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
// import { ClientKafka } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { isJSON } from 'class-validator';
import { Response } from 'express';
// import { Response } from 'express';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { IdentifierEnum } from '@/application/models/batch.log.model';
// import * as path from 'path';
import { ApplicationService } from '@/application/services/application.service';
import {
  copyFiletoInternal,
  readOneFile,
  // scanFilesOndirOnlyCsv,
} from '@/application/utils/File/file-management.service';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { GlobalResponse } from '@/dtos/response.dto';
// import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  // RequestValidatorFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
// import { FileBatchAddDTO } from '@/transaction/dtos/redeem/file_batch.dto';
import {
  GetMsisdnRedeemerParamDTO,
  RedeemDTO,
} from '@/transaction/dtos/redeem/redeem.dto';
import {
  ApiOperationRedeem,
  ApiParamRedeem,
} from '@/transaction/dtos/redeem/redeem.property.dto';
import { GetMsisdnRedeemerByVoucherCodeParamDTO } from '@/transaction/dtos/voucher/voucher.dto';
import {
  ApiOperationVoucher,
  ApiParamRedeemVoucherCode,
} from '@/transaction/dtos/voucher/voucher.property.dto';
import { BatchDto } from '@/transaction/models/batch/batch.dto';
import { CouponService } from '@/transaction/services/coupon/coupon.service';
// import { CouponService } from '@/transaction/services/coupon/coupon.service';
import { BatchRedeemService } from '@/transaction/services/redeem/batch_redeem.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class RedeemController {
  constructor(
    @Inject(RedeemService) private redeemService: RedeemService,
    @Inject(VoucherService) private voucherService: VoucherService,
    // @Inject(CouponService) private couponService: CouponService,
    // @Inject(ApplicationService) private applicationService: ApplicationService,
    @Inject(BatchRedeemService) private batchRedeemService: BatchRedeemService, // @Inject('ELIGIBILITY_SERVICE_PRODUCER') // private clientEligibility: ClientKafka, // @Inject('BATCH_PROCESS_SERVICE_PRODUCER') private clientBatch: ClientKafka,
  ) {
    //
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationVoucher.get_msisdn_redeemer_voucher_code)
  @ApiParam(ApiParamRedeemVoucherCode.voucher_code)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get('redeemer/:voucher_code')
  async getMisisdnByVoucherCode(
    @Param() param: GetMsisdnRedeemerByVoucherCodeParamDTO,
  ): Promise<any> {
    return await this.voucherService.getMsisdnByVoucherCode(param);
  }

  /* Redeem Verification  */
  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation(ApiOperationRedeem.redeem)
  // @ApiResponse(GlobalTransactionApiResponse.R200)
  // @ApiResponse(GlobalTransactionApiResponse.R400)
  // @ApiResponse(GlobalTransactionApiResponse.R403)
  // @ApiResponse(GlobalTransactionApiResponse.R404)
  // @ApiResponse(GlobalTransactionApiResponse.R405)
  // @ApiResponse(GlobalTransactionApiResponse.R500)
  // @ApiResponse(GlobalTransactionApiResponse.R500)
  // @Version('1')
  // @Post('redeem')
  // @HttpCode(202)
  // async redeem(
  //   @Body() data: RedeemDTO,
  //   @CredentialAccount() account,
  //   @Req() req,
  // ): Promise<any> {
  //   let origin = 'redeem';
  //
  //   // split param keyword
  //   const keywordFromBody = data.keyword.trim().split(' '); // pisahkan dengan spasi
  //   if (keywordFromBody.length >= 3) {
  //     const response = new GlobalTransactionResponse();
  //
  //     response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
  //     response.message = 'Keyword parameter format is wrong!';
  //     response.transaction_classify = 'REDEEM';
  //     response.trace_custom_code = 'RDM';
  //     response.payload = {};
  //
  //     return response;
  //   }
  //
  //   // if(!isNaN(data.total_redeem)) {
  //   //   if (data.total_redeem < 0){
  //   //     throw new BadRequestException([{ isInvalidDataContent: "Total Redeem Must More Than or Equal to 0" }]);
  //   //   }
  //
  //   //   if (!isInt(data.total_redeem)){
  //   //     throw new BadRequestException([{ isInvalidDataContent: "Total Redeem Must Be Numeric" }]);
  //   //   }
  //   // }
  //
  //   const is_bulk_redeem_bonus_approval_keyword =
  //     await this.redeemService.is_bulk_redeem_coupon_approval_keyword(
  //       keywordFromBody[0],
  //     );
  //
  //   // IF KEYWORD IS BULK REDEEM COUPON THE SECOND PARAMETER SHOULD BE OTP
  //   if (keywordFromBody.length == 2 && !is_bulk_redeem_bonus_approval_keyword) {
  //     data.total_redeem = Number(keywordFromBody[1]);
  //   }
  //
  //   data.keyword = keywordFromBody[0];
  //
  //   return await this.redeemService
  //     .redeem_v2(data, account, req.headers.authorization)
  //     .then(async (response) => {
  //       // SECTION HANDLING REDEEM BULK COUPON
  //       if (
  //         await this.redeemService.is_bulk_redeem_coupon_confirmation_keyword(
  //           data.keyword,
  //           response,
  //         )
  //       ) {
  //         await this.redeemService
  //           .process_bulk_redeem_coupon_confirmation_keyword(
  //             data,
  //             account,
  //             req.headers.authorization,
  //           )
  //           .then((res) => {
  //             response = res;
  //             origin = 'redeem2.bulk_redeem_coupon_confirmation';
  //
  //             return res;
  //           })
  //           .catch((e) => {
  //             return e;
  //           });
  //       } else if (
  //         is_bulk_redeem_bonus_approval_keyword &&
  //         keywordFromBody[1]
  //       ) {
  //         await this.redeemService
  //           .process_bulk_redeem_coupon_approval_keyword(
  //             data,
  //             response,
  //             account,
  //             req.headers.authorization,
  //             keywordFromBody[1],
  //           )
  //           .then((res) => {
  //             response = res;
  //
  //             return res;
  //           })
  //           .catch((e) => {
  //             return e;
  //           });
  //       }
  //       // END OF SECTION HANDLING REDEEM BULK COUPON
  //       await this.redeemService.emit_process(response, {
  //         path: req.url,
  //         token: req.headers.authorization,
  //         data,
  //         account,
  //         applicationService: this.applicationService,
  //         client: this.clientEligibility,
  //         origin: origin,
  //       });
  //
  //       return response;
  //     });
  // }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @UseInterceptors(CacheInterceptor)
  @ApiOAuth2(['oauth2'])
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation(ApiOperationRedeem.redeem)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('redeem')
  redeem_kafka(
    @Body() data: RedeemDTO,
    @CredentialAccount() account,
    @Req() req: FastifyRequest,
  ) {
    if (data?.keyword) {
      data.keyword = data.keyword.toUpperCase();
      console.log('Keyword uppercase: ', data.keyword);
    }

    // override locale
    data.locale = 'id-ID';

    const keywordFromBody = data.keyword.trim().split('-'); // pisahkan dengan strip
    if (keywordFromBody.length >= 3) {
      // const response = new GlobalTransactionResponse();

      // response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      // response.message = 'Keyword parameter format is wrong!';
      // response.transaction_classify = 'REDEEM';
      // response.trace_custom_code = 'RDM';
      // response.payload = {};

      // return response;
      throw new BadRequestException([
        { isInvalidDataContent: 'Keyword parameter format is wrong!' },
      ]);
    }

    if (keywordFromBody.length == 2 && keywordFromBody[0] != 'YA') {
      data.total_redeem = Number(keywordFromBody[1]);
    }

    // data.keyword = keywordFromBody[0];

    // set trx_source if not exist
    if (!data?.transaction_source) {
      data.transaction_source = 'api_v1';
    }

    return this.redeemService.redeem_v2_topic(
      data,
      account,
      // req.headers.authorization,
      req.headers.authorization,
      // req.url,
      req.url,
    );
  }

  /* Get Msisdn Redeemer */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationRedeem.get_msisdn_redeemer)
  @ApiParam(ApiParamRedeem.keyword)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get('redeem/:keyword')
  async get_msisdn_redeemer(@Param() param: GetMsisdnRedeemerParamDTO) {
    return await this.redeemService.get_msisdn_redeemer(param.keyword);
  }

  /**
   * This is a upload file redeem
   * @param credential
   * @param parameter
   * @param file
   * @returns
   */
  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Redeem Batch from file',
    description:
      'Redeem Batch from file, service can read a file on directory /uploads/redeem',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/redeem/',
      storage: diskStorage({
        destination: './uploads/redeem/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          cb(
            null,
            `RDM.${curr_date[0]}.${curr_date[1]}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  // @UseInterceptors(LoggingInterceptor)
  @Post('redeem/upload_check')
  async upload(
    @CredentialAccount() credential,
    @Body() parameter,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      response: parameter,
      file: file,
    };
  }

  @ApiOperation({
    summary: 'Redeem Batch',
    description:
      'Redeem Batch from scand file, service can read a file on directory /uploads/redeem',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @Version('1')
  @Post('redeem/batch')
  async read_upload(
    // batch dto exclude
    @Body() body: BatchDto,
    @CredentialAccount() account,
    @Req() req,
    @Query('identifier') identifier: IdentifierEnum,
  ) {
    return await this.batchRedeemService.batchRedeem(body, account, req);
  }

  @Get('redeem/batch/onefile')
  async read_upload2(@CredentialAccount() account, @Req() req) {
    return readOneFile('./uploads/redeem/', 'test.csv');
  }

  @Get('redeem/batch/copyfile')
  async read_upload3(@CredentialAccount() account, @Req() req) {
    return copyFiletoInternal('./uploads/redeem/', 'test.csv', 'RDM');
  }

  @ApiOperation({
    summary: 'Inject Point Batch',
    description:
      'Inject Point Batch from scand file, service can read a file on directory /uploads/inject/point',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @Version('1')
  @Post('inject_point/batch')
  async inject_point_batch(
    // batch dto exclude
    @Body() body: BatchDto,
    @CredentialAccount() account,
    @Req() req,
    @Query('identifier') identifier: IdentifierEnum,
  ) {
    return await this.batchRedeemService.batchRedeemInjectPoint(
      body,
      account,
      req,
    );
  }

  @ApiOperation({
    summary: 'Inject Coupon Batch',
    description:
      'Inject Coupon Batch from scand file, service can read a file on directory /uploads/inject/coupon',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @Version('1')
  @Post('inject_coupon/batch')
  async inject_coupon_batch(
    // batch dto exclude
    @Body() body: BatchDto,
    @CredentialAccount() account,
    @Req() req,
    @Query('identifier') identifier: IdentifierEnum,
  ) {
    return await this.batchRedeemService.batchRedeemInjectCoupon(
      body,
      account,
      req,
    );
  }

  @ApiOperation({
    summary: 'Coupon Data Sync Batch',
    description:
      'Coupon Data Sync Batch from scand file, service can read a file on directory /uploads/datasync/coupon',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @Version('1')
  @Post('coupon_datasync/batch')
  async coupon_data_sync_batch(
    // batch dto exclude
    @Body() body: BatchDto,
    @CredentialAccount() account,
    @Req() req,
    @Query('identifier') identifier: IdentifierEnum,
  ) {
    return await this.batchRedeemService.batchDataSyncCoupon(
      body,
      account,
      req,
    );
  }

  @Post('upload_file/batch')
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Upload Batch Redeem,Coupon,Poin',
    description:
      'Upload Redeem,Coupon,Poin Batch service can read a file on directory /anydirectory',
  })
  @Version('1')
  @ApiConsumes('multipart/form-data')
  async imageUpload(
    @Req() request: FastifyRequest,
    @Query('identifier') identifier: IdentifierEnum,
  ) {
    const data = await this.batchRedeemService.batchUpload(request, identifier);
    if (data.statusCode === 201) {
      return data;
    } else {
      throw new BadRequestException([data.message]);
    }
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @ApiQuery({
    name: 'type',
    type: String,
    example: 'inject_coupon',
    description: `Enum: redeem,inject_point,inject_coupon,redeem_batch,transfer_pulsa`,
    required: false,
  })
  @Version('1')
  @Get('batch_summary/prime')
  async summary_prime(
    @Query('lazyEvent') parameter: string,
    @Query('type') param: string,
    @Query('identifier') identifier: IdentifierEnum,
  ) {
    const lazyEvent = parameter;
    const type = param;

    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.batchRedeemService.getSummaryPrime(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        type,
        identifier,
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiParam({
    name: 'batch_id',
  })
  @ApiQuery(ApiQueryExample.primeDT)
  @Version('1')
  @Get('batch_detail/:batch_id/prime')
  async batch_detail(@Query('lazyEvent') parameter: string, @Param() param) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);

      return await this.batchRedeemService.batchDetailPrime(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param?.batch_id,
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiParam({
    name: 'batch_id',
  })
  @Version('1')
  @Get('batch_summary/:batch_id')
  async batch_detail_summary(@Param() param) {
    return await this.batchRedeemService.batchDetailSummary(param?.batch_id);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiParam({ name: 'batch_id' })
  @Version('1')
  @Get('batch_summary/:batch_id/export')
  async batch_detail_export(
    @Res({ passthrough: true }) res: Response,
    @Param() param,
  ) {
    return await this.batchRedeemService.batchDetailExport(
      res,
      param?.batch_id,
    );
  }
}
