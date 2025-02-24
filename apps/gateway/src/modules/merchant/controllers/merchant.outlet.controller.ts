import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { isJSON } from 'class-validator';

import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { Authorization } from '../../decorators/auth.decorator';
import { OAuth2Guard } from '../../guards/oauth.guard';
import { MerchantOutletAddDTO } from '../dto/outlet.merchant.add.dto';
import { MerchantOutletEditDTO } from '../dto/outlet.merchant.edit.dto';
import { MerchantOutletService } from '../services/merchant.outlet.service';
import { Response } from 'express';

@Controller({ path: 'merchant-outlet', version: '1' })
@ApiTags('Merchant Outlet Management')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class MerchantOutletController {
  private MerchantoutletService: MerchantOutletService;

  constructor(MerchantoutletService: MerchantOutletService) {
    this.MerchantoutletService = MerchantoutletService;
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
  async get_outlet_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;

    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.MerchantoutletService.get_merchant_outlet({
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

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Merchant Outlet Item',
    description: '',
  })
  @UseInterceptors(LoggingInterceptor)
  @Post()
  async add(@Body() parameter: MerchantOutletAddDTO) {
    return await this.MerchantoutletService.addOutletsToMerchant(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Merchant Outlet Item',
    description: '',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit')
  async edit(@Body() data: MerchantOutletEditDTO, @Param() param) {
    return await this.MerchantoutletService.editMerchantOutlet(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Merchant Outlet Item',
    description: '',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':_id/delete')
  async delete(@Param() param) {
    return await this.MerchantoutletService.deleteMerchantOutlet(param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Merchant Outlet detail By _id',
    description: 'Showing Merchant Outlet detail',
  })
  @ApiParam({
    name: '_id',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get(':_id/detail')
  async detail(@Param() parameter) {
    return await this.MerchantoutletService.get_merchant_outlet_detail(
      parameter._id,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Export Merchant Outlet Catalogue XML',
    description: 'Export Merchant Outlet Catalogue XML file',
  })
  @UseInterceptors(LoggingInterceptor)
  @Get('export')
  async merchant_export(
    @Res() res: Response,
    @Param() param,
  ) {
    return await this.MerchantoutletService.generateMerchantOutletXmlFileV2(
      true,
      res,
    );

  }
}
