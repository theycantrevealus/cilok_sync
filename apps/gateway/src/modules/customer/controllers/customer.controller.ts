import { InjectQueue } from '@nestjs/bull';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Queue } from 'bull';
import { isJSON } from 'class-validator';
import { diskStorage } from 'multer';
import { extname } from 'path';

import {
  CustomerMemberAddDTOResponse,
  CustomerMemberDto,
  MsisdnCheckerDTO,
} from '@/customer/dto/customer.member.dto';
import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import {
  CustomerAddDTO,
  CustomerAddDTOResponse,
} from '../dto/customer.add.dto';
import {
  CustomerBadgeAssignDTO,
  CustomerBadgeAssignDTOResponse,
} from '../dto/customer.assign.badge.dto';
import {
  CustomerBadgeAddDTO,
  CustomerBadgeAddDTOResponse,
} from '../dto/customer.badge.add.dto';
import {
  CustomerBadgeEditDTO,
  CustomerBadgeEditDTOResponse,
} from '../dto/customer.badge.edit.dto';
import {
  CustomerBrandAddDTO,
  CustomerBrandAddDTOResponse,
} from '../dto/customer.brand.add.dto';
import { CustomerBrandDeleteDTOResponse } from '../dto/customer.brand.delete.dto';
import {
  CustomerBrandEditDTO,
  CustomerBrandEditDTOResponse,
} from '../dto/customer.brand.edit.dto';
import { CustomerDeleteDTOResponse } from '../dto/customer.delete.dto';
import {
  CustomerEditDTO,
  CustomerEditDTOResponse,
} from '../dto/customer.edit.dto';
import {
  CustomerTierAddDTO,
  CustomerTierAddDTOResponse,
} from '../dto/customer.tier.add.dto';
import { CustomerTierDeleteDTOResponse } from '../dto/customer.tier.delete.dto';
import {
  CustomerTierEditDTO,
  CustomerTierEditDTOResponse,
} from '../dto/customer.tier.edit.dto';
import { CustomerBadgeUnAssignDTOResponse } from '../dto/customer.unassign.badge.dto';
import { ImportCustomerDto } from '../dto/customer.upload.dto';
import { CustomerService } from '../services/customer.service';

@Controller('customer')
@ApiTags('Customer Management')
export class CustomerController {
  private customerService: CustomerService;
  protected customerQueue: Queue;
  private logService: LogOauthSignInService;

  constructor(
    @InjectQueue('customer') customerQueue: Queue,
    customerService: CustomerService,
    logService: LogOauthSignInService,
  ) {
    this.customerService = customerService;
    this.logService = logService;
    this.customerQueue = customerQueue;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example: `{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}`,
    description: 'Format: Prime default param',
    required: false,
  })
  @ApiOperation({
    summary: 'Show all customer item',
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
  async get_customer_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.customerService.get_customer_2({
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
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description: 'Limit data to show',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description: 'Offset',
    required: false,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description:
      'You can define searching operator. ex: {"msisdn":"%6852xxxx%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"msisdn":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @ApiOperation({
    summary: 'List All Customer',
    description: 'Customer (MSISDN) Master Data',
  })
  @Get()
  async get_customer(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.customerService.get_customer({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'id',
    description:
      'The job async ID that you will get from registering import customer data',
  })
  @Get(':id/import_progress')
  async getJobImportCustomerResult(@Res() response, @Param('id') id: string) {
    const job = await this.customerQueue.getJob(id);

    if (!job) {
      return response.sendStatus(HttpStatus.NOT_FOUND);
    }

    const isCompleted = await job.isCompleted();

    if (!isCompleted) {
      return response.sendStatus(HttpStatus.ACCEPTED);
    } else {
      return response.sendStatus(HttpStatus.CREATED);
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Single Customer',
    description: 'Add single customer manually',
  })
  @Post()
  async add_customer(
    @Body() parameter: CustomerAddDTO,
  ): Promise<CustomerAddDTOResponse> {
    return await this.customerService.add_customer(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/customer/',
      storage: diskStorage({
        destination: './uploads/customer/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          cb(
            null,
            `CST.${curr_date[0]}.${curr_date[1]}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import Bulk MSISDN',
    description: 'For BI use',
  })
  @Post('import')
  async import_customer(
    @Body() upload: ImportCustomerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.customerService.import_customer(file);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Update Single Customer',
    description: 'Edit single customer manually',
  })
  @Put(':_id/edit')
  async edit_customer(
    @Body() data: CustomerEditDTO,
    @Param() param,
  ): Promise<CustomerEditDTOResponse> {
    return await this.customerService.edit_customer(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Single Customer',
    description: 'Delete single customer manually',
  })
  @Delete(':_id/delete')
  async delete_customer(
    @Param() parameter,
  ): Promise<CustomerDeleteDTOResponse> {
    return await this.customerService.delete_customer(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  // @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Detail Customer Item',
    description: '',
  })
  @Get(':_id/detail')
  async detail_customer(@Param() parameter) {
    return await this.customerService.get_customer_detail(parameter._id);
  }

  //=========================================================================TIER
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description: 'Limit data to show',
    required: true,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description: 'Offset',
    required: false,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description: 'You can define searching operator. ex: {"name":"%Silver%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"msisdn":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @ApiOperation({
    summary: 'List Customer Tier Master Data',
    description: 'Unique tier data. For Datatable and selection use',
  })
  @Get('tier')
  async get_tier(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ): Promise<any> {
    return await this.customerService.get_tier({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example: `{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}`,
    description: 'Format: Prime default param',
    required: false,
  })
  @ApiOperation({
    summary: 'Show all customer item',
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
  @Get('tier-prime')
  async get_customer_tier_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;

    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.customerService.get_tier_prime({
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
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Single Tier',
    description: 'Add single tier manually',
  })
  @Post('tier')
  async add_tier(
    @Body() parameter: CustomerTierAddDTO,
  ): Promise<CustomerTierAddDTOResponse> {
    return await this.customerService.add_tier(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Single Tier',
    description: 'Delete single tier manually',
  })
  @Delete('tier/:_id/delete')
  async delete_tier(
    @Param() parameter,
  ): Promise<CustomerTierDeleteDTOResponse> {
    return await this.customerService.delete_tier(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Update Single Tier',
    description: 'Edit single tier manually',
  })
  @Put('tier/:_id/edit')
  async edit_tier(
    @Body() data: CustomerTierEditDTO,
    @Param() param,
  ): Promise<CustomerTierEditDTOResponse> {
    return await this.customerService.edit_tier(data, param._id);
  }

  //=========================================================================BADGE
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description: 'Limit data to show',
    required: true,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description: 'Offset',
    required: false,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description: 'You can define searching operator. ex: {"name":"%Silver%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"msisdn":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @ApiOperation({
    summary: 'List Customer Badge Master Data',
    description: 'Unique badge data. For Datatable and selection use',
  })
  @Get('badge')
  async get_badge(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ): Promise<any> {
    return await this.customerService.get_badge({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example: `{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}`,
    description: 'Format: Prime default param',
    required: false,
  })
  @ApiOperation({
    summary: 'Show all customer item',
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
  @Get('badge-prime')
  async get_customer_badge_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;

    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.customerService.get_badge_prime({
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
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Single Badge',
    description: 'Add single badge manually',
  })
  @Post('badge')
  async add_badge(
    @Body() parameter: CustomerBadgeAddDTO,
  ): Promise<CustomerBadgeAddDTOResponse> {
    return await this.customerService.add_badge(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Assign Single Badge to Customer',
    description: 'Assign single badge manually to a customer',
  })
  @Post('badge/assign')
  async assign_badge(
    @Body() parameter: CustomerBadgeAssignDTO,
  ): Promise<CustomerBadgeAssignDTOResponse> {
    return await this.customerService.assign_badge(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Unassign Single Badge from Customer',
    description: 'Unassign single badge manually from a customer',
  })
  @Delete('badge/:_id/unassign')
  async unassign_badge(
    @Param() parameter,
  ): Promise<CustomerBadgeUnAssignDTOResponse> {
    return await this.customerService.unassign_badge(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Single Badge',
    description: 'Delete single badge manually',
  })
  @Delete('badge/:_id/delete')
  async delete_badge(@Param() parameter): Promise<CustomerDeleteDTOResponse> {
    return await this.customerService.delete_badge(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Update Single Badge',
    description: 'Edit single badge manually',
  })
  @Put('badge/:_id/edit')
  async edit_badge(
    @Body() data: CustomerBadgeEditDTO,
    @Param() param,
  ): Promise<CustomerBadgeEditDTOResponse> {
    return await this.customerService.edit_badge(data, param._id);
  }

  //=========================================================================BRAND
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description: 'Limit data to show',
    required: true,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description: 'Offset',
    required: false,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description: 'You can define searching operator. ex: {"name":"%Silver%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"msisdn":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @ApiOperation({
    summary: 'List Customer Brand Master Data',
    description: 'For Datatable and selection use',
  })
  @Get('brand')
  async get_brand(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ): Promise<any> {
    return await this.customerService.get_brand({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example: `{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}`,
    description: 'Format: Prime default param',
    required: false,
  })
  @ApiOperation({
    summary: 'Show all customer item',
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
  // @UseInterceptors(LoggingInterceptor)
  @Get('brand-prime')
  async get_customer_brand_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;

    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.customerService.get_brand_prime({
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
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @Post('brand')
  @ApiOperation({
    summary: 'Add Single Brand',
    description: 'Add single brand manually',
  })
  async add_brand(
    @Body() parameter: CustomerBrandAddDTO,
  ): Promise<CustomerBrandAddDTOResponse> {
    return await this.customerService.add_brand(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Single Brand',
    description: 'Delete single brand manually',
  })
  @Delete('brand/:_id/delete')
  async delete_brand(
    @Param() parameter,
  ): Promise<CustomerBrandDeleteDTOResponse> {
    return await this.customerService.delete_brand(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Update Single Brand',
    description: 'Edit single brand manually',
  })
  @Put('brand/:_id/edit')
  async edit_brand(
    @Body() data: CustomerBrandEditDTO,
    @Param() param,
  ): Promise<CustomerBrandEditDTOResponse> {
    return await this.customerService.edit_brand(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @Get('msisdn_checker')
  async msisdnChecker(@Req() req, @Param() parameter: MsisdnCheckerDTO) {
    return await this.customerService.msisdnCheck({
      msisdn: '081268137084',
      auth: req.headers.authorization,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @Post('members')
  @ApiOperation({
    summary: 'Add Single Member',
    description: 'Add single member manually',
  })
  async memberAdd(
    @Req() req,
    @Body() parameter: CustomerMemberDto,
  ): Promise<CustomerMemberAddDTOResponse> {
    return await this.customerService.memberAdd(
      parameter,
      req.headers.authorization,
    );
  }
}
