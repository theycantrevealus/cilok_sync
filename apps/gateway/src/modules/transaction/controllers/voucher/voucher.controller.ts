import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { isJSON } from 'class-validator';
import { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  RequestValidatorFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { VoucherCheckUpdateDTO } from '@/transaction/dtos/voucher/voucher.check.update.dto';
import { ApiOperationVoucher } from '@/transaction/dtos/voucher/voucher.property.dto';
import { VoucherStockSummaryDTO } from '@/transaction/dtos/voucher/voucher.stock.summary';
import {
  VoucherSummaryParamDTO,
  VoucherTransactionDetailParamDTO,
} from '@/transaction/dtos/voucher/voucher.upload.dto';
import {
  VoucherListParamDTO,
  VoucherListQueryDTO,
} from '@/transaction/dtos/voucher/voucher-list.dto';
import { VerificationVoucher } from '@/transaction/models/voucher/verification.voucher.model';
import { VerificationVoucherService } from '@/transaction/services/voucher/verification.voucher.services';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class VoucherController {
  private applicationService: ApplicationService;

  private configService: ConfigService;

  constructor(
    private voucherService: VoucherService,
    private verificationVoucherService: VerificationVoucherService,

    configService: ConfigService,
    @Inject('ELIGIBILITY_SERVICE_PRODUCER')
    private readonly clientEligibilty: ClientKafka,
    @Inject('BATCH_PROCESS_SERVICE_PRODUCER')
    private readonly clientBatch: ClientKafka,
  ) {
    this.configService = configService;
  }

  /* Voucher Verification  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationVoucher.verification)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post('voucher/verification')
  @HttpCode(200)
  @Version('1')
  async voucher_verification(
    @Body() data: VerificationVoucher,
    @CredentialAccount() account,
    @Req() req,
  ) {
    return await this.verificationVoucherService.voucher_verification(
      data,
      account,
      req.headers.authorization,
      req.url,
    );
  }

  /* Voucher List */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'View Voucher List',
  })
  @Version('1')
  @Get(':msisdn/voucher')
  async voucher_list(
    @Param() param: VoucherListParamDTO,
    @Query() query: VoucherListQueryDTO,
  ) {
    return await this.voucherService.voucher_list(param, query);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Checking voucher data from core and update',
  })
  @Version('1')
  @Post('voucher/check/update')
  async voucherCheckUpdate(@Body() data: VoucherCheckUpdateDTO, @Req() req) {
    return await this.voucherService.voucherCheckUpdate(
      data,
      req.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Summary voucher stock',
  })
  @Version('1')
  @HttpCode(200)
  @Post('voucher/stock/summary')
  async VoucherUploadSummary(@Body() data: VoucherStockSummaryDTO, @Req() req) {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'VOUCHER_STOCK';
    try {
      const voucher = await this.voucherService.accumulateVoucher(
        data,
        req.headers.authorization,
      );
      response.message = voucher.message;
      delete voucher.message;
      response.payload = { ...voucher };
      response.code = voucher.status
        ? HttpStatusTransaction.CODE_SUCCESS
        : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
    } catch (e) {
      throw new Error(e.message);
    }

    return response;
  }

  /* Voucher Verification List */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @ApiOperation({
    summary: 'List voucher verification redeemed',
  })
  @Version('1')
  @Get('voucher/verification')
  async voucherVerificationList(
    @Query('lazyEvent') parameter: string,
    @Req() req,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.verificationVoucherService.redeemed({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  /**
   * Controller endpoint to update the status of pending vouchers based on batch number.
   * @param batch_no - The batch number for updating pending vouchers.
   * @param req - The request object containing headers.
   * @returns Promise<any> - A Promise containing the response data from the service operation.
   */

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Update status of pending vouchers based on batch_no',
  })
  @ApiParam({
    name: 'batch_no',
    type: String,
    example: '',
    description:
      'Batch number for updating the status of vouchers based on the batch',
    required: true,
  })
  @Version('1')
  @Patch('voucher/:batch_no/pending/batch')
  async voucherUpdatePendingBasedOnBatchNo(
    @Param('batch_no') batch_no: string,
    @Req() req,
    @CredentialAccount() account,
  ) {
    const token = req.headers.authorization;

    // Call the service to update pending vouchers based on batch number
    const result =
      await this.voucherService.updatePendingVouchersBasedOnBatchNo(
        batch_no,
        token,
        account,
      );

    return result;
  }

  /**
   * Controller endpoint to download pending vouchers based on batch number.
   * @param batch_no - The batch number for find pending vouchers.
   * @param req - The request object containing headers.
   * @returns Promise<any> - A Promise containing the response data from the service operation.
   */

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Download status of pending vouchers based on batch_no',
  })
  @ApiParam({
    name: 'batch_no',
    type: String,
    example: '',
    description:
      'Batch number for find the status of vouchers based on the batch',
    required: true,
  })
  @Version('1')
  @Post('voucher/download/pending/:batch_no')
  async voucherDownloadPendingBasedOnBatchNo(
    @Param('batch_no') batch_no: string,
    @Req() req,
    @CredentialAccount() account,
  ) {
    const token = req.headers.authorization;

    // Call the service to sent request download pending vouchers based on batch_no
    const result =
      await this.voucherService.downloadPendingVouchersBasedOnBatchNo(
        batch_no,
        token,
        account,
      );

    return result;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @Version('1')
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiOperation({
    summary: 'Show all program item',
    description: `<table>
    <tr>
      <td>
        first<br />
        <i>Offset of data</i>
      </td>
      <td>:</td>
      <td><b>number</b></td>
    </tr>
    <tr>
      <td>
      rows<br />
      <i>Limit data in page</i>
      </td>
      <td>:</td>
      <td><b>number</b></td>
      </tr>
    <tr>
      <td>
        sortField<br />
        <i>Field to be sort</i>
      </td>
      <td>:</td>
      <td><b>string</b></td>
    </tr>
    <tr>
      <td>
      sortOrder<br />
      <i>1 is ascending. -1 is descending</i>
      </td>
      <td>:</td>
      <td><b>number</b></td>
    </tr>
    <tr>
    <td>filters</td>
    <td>:</td>
    <td>
    <b>object</b><br />
    <table>
      <tr>
      <td>
      column_name_1<br />
      <i>Name of column to be searched</i>
      </td>
      <td>:</td>
      <td>
      <b>object</b>
      <table>
      <tr>
        <td>matchMode</td>
        <td>:</td>
        <td>
        <b>string</b><br />
        Only filled by following item:
        <ul>
          <li>
          <b>contains</b><br />
          Will search all data if column_name_1 contains the value
          <br />
          </li>
          <li>
          <b>notContains</b><br />
          Will search all data if column_name_1 not contains the value
          <br />
          </li>
          <li>
          <b>startsWith</b><br />
          Will search all data if column_name_1 starts with the value
          <br />
          </li>
          <li>
          <b>endsWith</b><br />
          Will search all data if column_name_1 ends with the value
          <br />
          </li>
          <li>
          <b>equals</b><br />
          Will search all data if column_name_1 equals to the value
          <br />
          </li>
          <li>
          <b>notEquals</b><br />
          Will search all data if column_name_1 not equals to the value
          <br />
          </li>
        </li>
        </td>
      </tr>
      <tr>
        <td>value</td>
        <td>:</td>
        <td><b>string</b></td>
      </tr>
      </table>
      </td>
      </tr>
      <tr>
      <td>
      column_name_2<br />
      <i>Name of column to be searched</i>
      </td>
      <td>:</td>
      <td>
      <b>object</b>
      <table>
      <tr>
        <td>matchMode</td>
        <td>:</td>
        <td>
        <b>string</b><br />
        Only filled by following item:
        <ul>
          <li>
          <b>contains</b><br />
          Will search all data if column_name_2 contains the value
          <br />
          </li>
          <li>
          <b>notContains</b><br />
          Will search all data if column_name_2 not contains the value
          <br />
          </li>
          <li>
          <b>startsWith</b><br />
          Will search all data if column_name_2 starts with the value
          <br />
          </li>
          <li>
          <b>endsWith</b><br />
          Will search all data if column_name_2 ends with the value
          <br />
          </li>
          <li>
          <b>equals</b><br />
          Will search all data if column_name_2 equals to the value
          <br />
          </li>
          <li>
          <b>notEquals</b><br />
          Will search all data if column_name_2 not equals to the value
          <br />
          </li>
        </li>
        </td>
      </tr>
      <tr>
        <td>value</td>
        <td>:</td>
        <td><b>string</b></td>
      </tr>
      </table>
      </td>
      </tr>
    </table>
    </td>
    </tr>
    </table>`,
  })
  @UseInterceptors(LoggingInterceptor)
  @Version('1')
  @Get('voucher/core/prime')
  async view_voucher_core_prime(
    @Query('lazyEvent') parameter: string,
    @Req() req,
  ) {
    const token = req.headers.authorization;
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.voucherService.getVoucherCorePrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        token: token,
      });
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
  @ApiQuery(ApiQueryExample.primeDT)
  @ApiOperation({
    summary: 'Get Sumary Upload',
  })
  @Version('1')
  @Get('voucher/upload/summary')
  async voucherUploadSummary(
    @Query('lazyEvent') parameter: string,
    @Req() req,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.voucherService.voucherUploadSummary({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        token: req.headers.authorization,
      });
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
  @ApiOperation({
    summary: 'Get Voucher Summary All Status Upload',
  })
  @Version('1')
  @Get('voucher/status/summary/:keyword_id')
  async totalVoucherSummaryFromCore(
    @Req() req,
    @Param() param: VoucherSummaryParamDTO,
  ) {
    return await this.voucherService.totalVoucherSummaryFromCore(
      param.keyword_id,
      req.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Get Voucher Transaction Detail',
  })
  @Version('1')
  @Post('voucher/transaction/detail')
  async checkVoucherTransactionDetail(
    @Body() data: VoucherTransactionDetailParamDTO,
  ) {
    return await this.voucherService.checkVoucherTransactionDetail(data);
  }
}
