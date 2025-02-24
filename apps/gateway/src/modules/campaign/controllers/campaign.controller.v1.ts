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
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
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
import { isJSON } from 'class-validator';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { AccountService } from '@/account/services/account.service';
import { CampaignEditDTO } from '@/campaign/dto/campagin.edit.dto.v1';
import { CampaignAddDTO } from '@/campaign/dto/campaign.add.dto.v1';
// import { CampaignAnalyticGetBroadcastDto } from '../dto/campaign.analytic.getcustomer.dto';
import { CampaignAnalyticAddDTO } from '@/campaign/dto/campaign.analytic.add.dto.v1';
import { CampaignAnalyticEditDTO } from '@/campaign/dto/campaign.analytic.edit.dto.v1';
import { CampaignRebroadcastDTO } from '@/campaign/dto/campaign.rebroadcast.add.dto';
import { CampaignRecipientAddDTO } from '@/campaign/dto/campaign.recipient.add.dto.v1';
import { CampaignServiceV1, TypeRecipientDeleteProcess } from '@/campaign/services/campaign.service.v1';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

@Controller({ path: 'campaign-broadcast', version: '1' })
@ApiTags('Campaign Management')
export class CampaignControllerV2 {
  private campaignService: CampaignServiceV1;

  constructor(
    campaignService: CampaignServiceV1,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {
    this.campaignService = campaignService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new campaign',
    description: 'Add new campaign',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @Post()
  async add(
    @Body() parameter: CampaignAddDTO,
    @Req() req,
    @CredentialAccount() credential,
  ): Promise<GlobalTransactionResponse> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.campaignService.addCampaign(parameter, accountSet);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Edit campaign value',
    description: 'Edit campaign value by ID',
  })
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put('/:id')
  async editCampaign(
    @Body() data: CampaignEditDTO,
    @Param() param,
  ): Promise<GlobalTransactionResponse> {
    return await this.campaignService.editCampaign(data, param.id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete campaign item',
    description: 'Delete soft campaign item by ID',
  })
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('/:id')
  async deleteSoftCampaign(
    @Param() parameter,
  ): Promise<GlobalTransactionResponse> {
    return await this.campaignService.deleteSoftCampaign(parameter.id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Cancel campaign item',
    description: 'Cancel campaign item by ID',
  })
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('/cancel/:id')
  async cancelCampaign(
    @Param() parameter,
  ): Promise<GlobalTransactionResponse> {
    return await this.campaignService.cancelCampaign(parameter.id);
  }

  //@UseGuards(OAuth2Guard)
  //@Authorization(true)
  //@ApiOAuth2(['oauth2'])
  //@ApiOperation({
  //  summary: 'Find campaign item by ID',
  //  description: 'Showing detail of campaign data',
  //})
  //@ApiParam({
  //  name: '_id',
  //})
  //@UseInterceptors(LoggingInterceptor)
  //@Get(':_id/detail')
  //async findCampaignById(@Param() parameter) {
  //  // return await this.campaignService.findCampaignById(parameter._id);
  //}

  @UseGuards(OAuth2Guard)
  @Authorization(true)
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
    summary: 'Show all campaign item',
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
  @Get('/')
  async getCampaignPrimeTable(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.campaignService.getCampaignPrimeTable({
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
  @ApiParam({
    name: 'campaign_id',
    description: 'Get _id from Campaign',
  })
  @ApiOperation({
    summary: 'Get Detail Campaign'
  })
  @Get('/:campaign_id')
  async getCampaignDetail(
    @Param() param,
  ) {
    return await this.campaignService.getCampaignRecipientSummary(
      param.campaign_id,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiParam({
    name: 'campaign_id',
    description: 'Get _id from Campaign',
  })
  @ApiOperation({
    summary: 'Show all campaign item',
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
  @Get('/:campaign_id/recipient')
  async getCampaignRecipientPrimeTable(
    @Query('lazyEvent') parameter: string,
    @Param() param,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);

      return await this.campaignService.getCampaignRecipientPrimeTable(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param.campaign_id,
      );
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
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiParam({
    name: 'campaign_id',
    description: 'Campaign ID',
  })
  @ApiOperation({
    summary: 'Show all campaign item',
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
  @Get('/broadcast-detail/:campaign_id')
  async broadcastDetailResult(
    @Query('lazyEvent') parameter: string,
    @Param() param,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.campaignService.broadcastDetailResult(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param.campaign_id,
      );
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
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiParam({
    name: 'summary_id',
    description: 'Summary ID',
  })
  @ApiOperation({
    summary: 'Show all summary detail of campaign (list of msisdn)',
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
  @Get('/summary-detail/:summary_id')
  async broadcastSummaryDetail(
    @Query('lazyEvent') parameter: string,
    @Param() param,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.campaignService.broadcastSummaryDetailResult(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param.summary_id,
      );
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
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiParam({
    name: 'campaign_id',
    description: 'Campaign ID',
  })
  @ApiOperation({
    summary: 'Show all summary of broadcast result',
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
  @Get('summary/:campaign_id')
  async summaryPerCampaign(
    @Query('lazyEvent') parameter: string,
    @Param() param,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.campaignService.summaryPerCampaign(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param.campaign_id,
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  // /**
  //  * @deprecated
  //  * Deprecated because using express mechanism
  //  * Now this project is using fastify as http framework
  //  * @param body 
  //  * @param file 
  //  * @returns 
  //  */
  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation({
  //   summary: 'Add recipient of campaign',
  //   description: 'Add recipient of campaign by upload file',
  // })
  // @UseInterceptors(
  //   FileInterceptor('file', {
  //     dest: './uploads/campaign/recipient/',
  //     storage: diskStorage({
  //       destination: './uploads/campaign/recipient/',
  //       filename: (req, file, cb) => {
  //         const curr_date = new Date().toISOString().split('T');
  //         const time = curr_date[1].split('.')[0].replace(/:/g, '');
  //         cb(
  //           null,
  //           `${curr_date[0].replace(/-/g, '')}_${time}${extname(
  //             file.originalname,
  //           )}`,
  //         );
  //       },
  //     }),
  //   }),
  // )
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(LoggingInterceptor)
  // // @Post('recipient')
  // async addRecipient(
  //   @Body() body: CampaignRecipientAddDTO,
  //   @UploadedFile() file: Express.Multer.File,
  // ): Promise<any> {
  //   return await this.campaignService.addCampaignRecipient(file, body);
  // }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add recipient of campaign',
    description: 'Add recipient of campaign by upload file',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(LoggingInterceptor)
  @Post('recipient')
  async addRecipientV2(@Body() body: CampaignRecipientAddDTO): Promise<any> {
    const files = body.file;
    const uploadedPath = [];

    try {
      const path = './uploads/campaign/recipient/';
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const filename = `BROADCAST_RECIPIENT_${body.campaign_id}_${curr_date[0]}_${time}`;

      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }

      for (const file of files) {
        const writePath = `${path}/${filename}${extname(file.filename)}`;
        fs.writeFileSync(writePath, file.data);
        uploadedPath.push(writePath);
      }

      return await this.campaignService.addCampaignRecipientV2(
        uploadedPath[0],
        body,
      );
    } catch (err) {
      console.error(err);
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API Summary Uploaded File',
    description: 'Showing detail of file upload content status',
  })
  @ApiParam({
    name: 'campaign_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Get('summary-upload-file/:campaign_id')
  async summaryUploadedFile(@Param() param) {
    return await this.campaignService.uploadSummaryFile(param);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiParam({
    name: 'campaign_id',
    description: 'Campaign ID',
  })
  @ApiOperation({
    summary: 'Show all summary of broadcast result of analytic campaign type',
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
  @Get('summary/analytic/:campaign_id')
  async summaryAnalyticPerCampaign(
    @Query('lazyEvent') parameter: string,
    @Param() param,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.campaignService.summaryAnalyticPerCampaign(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param.campaign_id,
      );
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
    summary: 'API Get Customer from Core',
    description: 'Showing customer by custom filter from core',
  })
  // @UseInterceptors(LoggingInterceptor)
  // @UsePipes(ValidationPipe)
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description: `Segmentation filter configuration </br>
    <pre>
      <code>
      {
        &nbsp;&nbsp;"customer_tier": ["tier_id1", "tier_id2"],
        &nbsp;&nbsp;"customer_brand": [],
        &nbsp;&nbsp;"customer_location": ["LOCATION_1", "LOCATION_2"],
        &nbsp;&nbsp;"customer_los": {
            &nbsp;&nbsp;&nbsp;&nbsp;"operator": "Range",
            &nbsp;&nbsp;&nbsp;&nbsp;"value_start": 60,
            &nbsp;&nbsp;&nbsp;&nbsp;"value_end": 100
        &nbsp;&nbsp;},
        &nbsp;&nbsp;"poin_range": {
            &nbsp;&nbsp;&nbsp;&nbsp;"value_start": 40,
            &nbsp;&nbsp;&nbsp;&nbsp;"value_end": 60
        &nbsp;&nbsp;},
        &nbsp;&nbsp;"bcp_category": {
            &nbsp;&nbsp;&nbsp;&nbsp;"operator": "EQUAL",
            &nbsp;&nbsp;&nbsp;&nbsp;"value": "CHAT"
        &nbsp;&nbsp;},
        &nbsp;&nbsp;"bcp_name": {
            &nbsp;&nbsp;&nbsp;&nbsp;"operator": "EQUAL",
            &nbsp;&nbsp;&nbsp;&nbsp;"value": "WhatsApp~Skype~GoogleContacts"
        &nbsp;&nbsp;}
      }
      </code>
    </pre><br />`,
  })
  @Get('analytic/get-customer')
  async getCoreCustomer(
    //@Body() params: CampaignAnalyticGetBroadcastDto,
    @Query('filter') filter: string,
    @Req() req,
  ) {
    //return await this.campaignService.getCoreCustomer(
    //  req.headers.authorization, params
    //);

    const filterParse = JSON.parse(filter);
    return await this.campaignService.getCustomerCore(
      filterParse,
      req.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API Get Customer Total from Core',
    description: 'Showing total of customer by custom filter from core',
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description: `Segmentation filter configuration </br>
    <pre>
      <code>
      {
        &nbsp;&nbsp;"customer_tier": ["tier_id1", "tier_id2"],
        &nbsp;&nbsp;"customer_brand": [],
        &nbsp;&nbsp;"customer_location": ["LOCATION_1", "LOCATION_2"],
        &nbsp;&nbsp;"customer_los": {
            &nbsp;&nbsp;&nbsp;&nbsp;"operator": "Range",
            &nbsp;&nbsp;&nbsp;&nbsp;"value_start": 60,
            &nbsp;&nbsp;&nbsp;&nbsp;"value_end": 100
        &nbsp;&nbsp;},
        &nbsp;&nbsp;"poin_range": {
            &nbsp;&nbsp;&nbsp;&nbsp;"value_start": 40,
            &nbsp;&nbsp;&nbsp;&nbsp;"value_end": 60
        &nbsp;&nbsp;},
        &nbsp;&nbsp;"bcp_category": {
            &nbsp;&nbsp;&nbsp;&nbsp;"operator": "EQUAL",
            &nbsp;&nbsp;&nbsp;&nbsp;"value": "CHAT"
        &nbsp;&nbsp;},
        &nbsp;&nbsp;"bcp_name": {
            &nbsp;&nbsp;&nbsp;&nbsp;"operator": "EQUAL",
            &nbsp;&nbsp;&nbsp;&nbsp;"value": "WhatsApp~Skype~GoogleContacts"
        &nbsp;&nbsp;}
      }
      </code>
    </pre><br />`,
  })
  @Get('analytic/get-customer-summary')
  async getCoreCustomerSummary(@Query('filter') filter: string, @Req() req) {
    const filterParse = JSON.parse(filter);
    return await this.campaignService.getCoreCustomerSummary(
      filterParse,
      req.headers.authorization,
    );
  }

  //@UseGuards(OAuth2Guard)
  //@Authorization(true)
  //@ApiOAuth2(['oauth2'])
  //@ApiOperation({
  //  summary: 'Delete campaign recipient item',
  //  description: 'Delete campaign recipient item permanently',
  //})
  //@ApiParam({
  //  name: '_id',
  //})
  //@UseInterceptors(LoggingInterceptor)
  //@Delete('recipient/:_id/delete')
  //async deleteCampaignRecipient(@Param() parameter) {
  //  //return await this.campaignService.deleteCampaignRecipient(parameter._id);
  //}

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Download failed msisdn per campaign',
    description:
      'For download file, the content is list of failed msisdn per campaign',
  })
  @ApiParam({
    name: 'campaign_id',
  })
  @Get('failed-recipient-download/:campaign_id')
  async exportFailedCampaignRecipient(
    @Res({ passthrough: true }) res: Response,
    @Param() parameter,
  ) {
    return await this.campaignService.exportFailedCampaignRecipient(
      res,
      parameter.campaign_id,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API Create rebroadcast schedule',
    description: 'Create new schedule for rebroadcast',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @Post('/rebroadcast')
  async addRebroadcastCampaign(
    @Body() param: CampaignRebroadcastDTO,
    @Req() request,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.addRebroadcastCampaign(param, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API delete campaign rebroadcast schedule',
    description: 'Delete schedule for rebroadcast',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @ApiParam({
    name: 'campaign_id',
  })
  @Delete('/rebroadcast/:campaign_id')
  async deleteRebroadcastCampaign(
    @Param() param,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.deleteRebroadcastCampaign(
      param.campaign_id,
      credential,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API Create rebroadcast schedule for campaign analytic',
    description: 'Create new schedule for rebroadcast for campaign analytic',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @Post('/analytic/rebroadcast')
  async addRebroadcastCampaignAnalytic(
    @Body() param: CampaignRebroadcastDTO,
    @Req() request,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.addRebroadcastCampaignAnalytic(
      param,
      credential,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API delete campaign analytic rebroadcast schedule',
    description: 'Delete schedule for rebroadcast',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @ApiParam({
    name: 'campaign_id',
  })
  @Delete('/rebroadcast/analytic/:campaign_id')
  async deleteRebroadcastCampaignAnalytic(
    @Param() param,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.deleteRebroadcastCampaignAnalytic(
      param.campaign_id,
      credential,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new campaign analytic',
    description: 'Add new campaign analytic',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @Post('/analytic')
  async addCampaignAnalytic(
    @Body() parameter: CampaignAnalyticAddDTO,
    @Req() request,
    @CredentialAccount() credential,
  ): Promise<GlobalTransactionResponse> {
    return await this.campaignService.addCampaignAnalytic(
      parameter,
      credential,
      request.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Edit campaign analytic value',
    description: 'Edit campaign analytic value by ID',
  })
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put('/analytic/:id')
  async editCampaignAnalytic(
    @Body() data: CampaignAnalyticEditDTO,
    @Param() param,
    @Req() request,
  ): Promise<GlobalTransactionResponse> {
    return await this.campaignService.editCampaignAnalytic(
      data,
      param.id,
      request.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete campaign analytic item',
    description: 'Delete soft campaign analytic item by ID',
  })
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('/analytic/:id')
  async deleteSoftCampaignAnalytic(
    @Param() parameter,
  ): Promise<GlobalTransactionResponse> {
    return await this.campaignService.deleteSoftCampaignAnalytic(parameter.id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
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
    summary: 'Show all campaign item',
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
  @Get('/analytic')
  async getCampaignAnalyticPrimeTable(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.campaignService.getCampaignAnayliticPrimeTable({
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
    summary: 'API delete recipient',
    description: 'Delete recipient campaign',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @ApiParam({
    name: 'recipient_id',
  })
  @Delete('/recipient/:recipient_id')
  async deleteRecipeint(
    @Param() param,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.deleteRecipient(
      {
        recipient_id: param.recipient_id,
        type: TypeRecipientDeleteProcess.SINGLE,
        credential
      }
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API delete recipient invalid msisdn',
    description: 'Delete all recipient campaign invalid',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @ApiParam({
    name: 'campaign_id',
  })
  @Delete('/recipient/:campaign_id/delete-all-unmatch')
  async deleteRecipeintUnmatch(
    @Param() param,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.deleteRecipient(
      {
        campaign_id: param.campaign_id,
        type: TypeRecipientDeleteProcess.INVALID,
        credential
      }
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'API delete All recipient ',
    description: 'Delete recipient campaign',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @ApiParam({
    name: 'campaign_id',
  })
  @Delete('/recipient/:campaign_id/delete-all')
  async deleteRecipeintAll(
    @Param() param,
    @CredentialAccount() credential,
  ) {
    return await this.campaignService.deleteRecipient(
      {
        campaign_id: param.campaign_id,
        type: TypeRecipientDeleteProcess.All,
        credential
      }
    );
  }
}
