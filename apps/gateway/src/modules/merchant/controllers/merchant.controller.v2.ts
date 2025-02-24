import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Observable, of } from 'rxjs';

import { isJson } from '@/application/utils/JSON/json';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  
  
  AllExceptionsFilter,
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { ImageAuctionAddDTO } from '@/keyword/dto/keyword.image.auction.add.dto';
import { MerchantV2AddDTO } from '@/merchant/dto/merchant.add.v2.dto';
import { MerchantEditV2DTO } from '@/merchant/dto/merchant.edit.v2.dto';
import { MerchantV2Service } from '@/merchant/services/merchant.service.v2';
import { Account } from "@/account/models/account.model";
import { AccountService } from '@/account/services/account.service';

@Controller({ path: 'merchant', version: '2' })
@ApiTags('Merchant Management')
@UseFilters(
  AllExceptionsFilter
)
export class MerchantV2Controller {
  private merchantV2Service: MerchantV2Service;

  constructor(@Inject(AccountService) private readonly accountService: AccountService,merchantV2Service: MerchantV2Service) {
    this.merchantV2Service = merchantV2Service;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
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
  @Get('prime')
  async get_merchant_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;

    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.merchantV2Service.get_merchant({
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

  @Get('fixing')
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  async fixData(@CredentialAccount() account: Account) {
    return await this.merchantV2Service.dataFixMerchant(account);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Merchant V2 Item',
    description:
      'Refference Example Data link : https://ptmitrabhakticom.sharepoint.com/:x:/r/sites/PT.MITRABHAKTIINFORMASI-SmileLoyalty/_layouts/15/Doc.aspx?sourcedoc=%7B0F17D993-1242-4833-89FC-45A40D87E190%7D&file=(REF)merchant_lolyta.xlsx&action=default&mobileredirect=true&DefaultItemOpen=1',
  })
  @UseInterceptors(LoggingInterceptor)
  // @UsePipes(ValidationPipe)
  @Post()
  async add(
    @Body() parameter: MerchantV2AddDTO,
    @CredentialAccount() credential: Account,
    @Req() req,
  ) {
    const accountSet : any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization
    });
    return await this.merchantV2Service.addMerchant(parameter, accountSet);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Merchant Item',
    description: '',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit')
  async edit(@Body() data: MerchantEditV2DTO, @Param() param) {
    return await this.merchantV2Service.editMerchant(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Merchant Item',
    description: '',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':_id/delete')
  async delete(@Param() param) {
    return await this.merchantV2Service.deleteMerchant(param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Merchant detail By _id',
    description: 'Showing Merchant detail',
  })
  @ApiParam({
    name: '_id',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get(':_id/detail')
  async detail(@Param() parameter) {
    return await this.merchantV2Service.detail(parameter._id);
  }

  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @ApiParam({
  //   name: 'imagename',
  // })
  // @Get(':imagename')
  // getFile(@Param() param, @Res() res): Observable<any> {
  //   return of(
  //     res.sendFile(join(process.cwd(), 'uploads/merchant/' + param.imagename)),
  //   );
  // }
  // @UseGuards(OAuth2Guard)
  // @Authorization(false)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation({
  //   summary: 'Upload logo for merchant',
  //   description: 'Upload logo for merchant',
  // })
  // @UseInterceptors(LoggingInterceptor)
  // @UseInterceptors(
  //   FileInterceptor('image', {
  //     dest: './uploads/merchant/',
  //     storage: diskStorage({
  //       destination: './uploads/merchant/',
  //       filename: (req, file, cb) => {
  //         const randomName = Array(32)
  //           .fill(null)
  //           .map(() => Math.round(Math.random() * 16).toString(16))
  //           .join('');
  //         return cb(null, `${randomName}${extname(file.originalname)}`);
  //       },
  //     }),
  //   }),
  // )
  // @ApiConsumes('multipart/form-data')
  // @Post('logo')
  // async imageUpload(
  //   @Body() data: ImageAuctionAddDTO,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   return this.merchantV2Service.imageupload(data, file);
  // }
}
