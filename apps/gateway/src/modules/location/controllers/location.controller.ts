import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
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
import { extname, parse } from 'path';

import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import { customSort, isJson } from '@/application/utils/JSON/json';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalResponse } from '@/dtos/response.dto';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import {
  ApiOperations,
  bucketAddDTO,
  bucketBulkDeleteQueryDTO,
  bucketDeleteParamDTO,
  bucketResDTO,
  bucketUpdateBodyDTO,
  bucketUpdateParamDTO,
} from '../attribute/bucket.api.helper';
import {
  LocationAddDTO,
  LocationAddDTOResponse,
  LocationBulkDTO,
} from '../dto/location.add.dto';
import { LocationEditDTO } from '../dto/location.edit.dto';
import { LocationImportDto } from '../dto/location.upload.dto';
import { LocationService } from '../services/location.service';

import util from 'util';
import stream = require('stream');
import {FastifyRequest} from "fastify";
import {LocationImportTimezoneDTO} from "@/location/dto/location.import.timezone.dto";

@Controller('location')
@ApiTags('Location Management')
@Controller('location')
export class LocationController {
  private locationService: LocationService;
  private logService: LogOauthSignInService;
  constructor(
    @Inject(AccountService) private readonly accountService: AccountService,
    locationService: LocationService,
    logService: LogOauthSignInService,
    @Inject('LOCATION_SERVICE_PRODUCER')
    private readonly clientLocationKafka: ClientKafka,
  ) {
    this.locationService = locationService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
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
    required: true,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description:
      'You can define searching operator. ex: {"group_name":"%group_name_one%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @ApiOperation({
    summary: 'List all location',
    description:
      'Location (List of values) used to store all default value or selection collection that rarely changes',
  })
  @Get('tree')
  async index_tree(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @CredentialAccount() account: Account,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.locationService.getLocationTree({
      account: accountSet,
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  // @ApiQuery({
  //   name: 'parent',
  //   type: String,
  //   example: '',
  // })
  @ApiQuery({
    name: 'type',
    type: String,
    example: '',
  })
  @ApiQuery({
    name: 'rebase',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiOperation({
    summary: 'List location tree using current credential data',
    description: `HQ - 62ffc0fc8a01008799e785bc<br />
    Area - 62ffc0fc8a01008799e785bd<br />
    Region - 62ffc0fc8a01008799e785be<br />
    Branch - 62ffc0fc8a01008799e785bf`,
  })
  @Get('loc_rebase')
  async index_rebase(
    // @Query('parent') parent: string,
    @Query('type') type: string,
    @Query('rebase') rebase: string,
    @CredentialAccount() account: any,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    const location = accountSet.account_location;
    // const location_type = account.account_location.location_detail.type;
    const location_iden = await this.locationService.detailLocation(
      location.location.toString(),
    );
    let selfMe = [];

    if (rebase === 'true') {
      if (type === location_iden.type.toString()) {
        selfMe.push(
          await this.locationService.detailLocation(
            location.location.toString(),
          ),
        );
      }
    } else {
      selfMe.push(
        await this.locationService.detailLocation(location.location.toString()),
      );
    }

    selfMe = selfMe.concat(
      await this.locationService.rebaseLocation(
        location.location.toString(),
        type,
      ),
    );

    const sorted = selfMe.sort(customSort('name'));

    return sorted;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
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
    required: true,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description:
      'You can define searching operator. ex: {"group_name":"%group_name_one%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @ApiOperation({
    summary: 'List all location',
    description:
      'Location (List of values) used to store all default value or selection collection that rarely changes',
  })
  @Get()
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.locationService.getLocation({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Location Item',
    description: 'group_name is used for grouping value',
  })
  @Post()
  async add(@Body() parameter: LocationAddDTO) {
    return await this.locationService.addLocation(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Bulk Location Item',
    description: 'Bulk data of location',
  })
  @Post('bulk')
  async add_bulk(
    @Body() parameter: LocationBulkDTO,
    @CredentialAccount() credential,
  ): Promise<LocationAddDTOResponse> {
    return await this.locationService.addLocationBulk(parameter, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Location Item',
    description: 'group_name is used for grouping value',
  })
  @Put(':_id/edit')
  async edit_customer(@Body() data: LocationEditDTO, @Param() param) {
    return await this.locationService.editLocation(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Location Item',
    description: '',
  })
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter) {
    return await this.locationService.deleteLocation(parameter._id);
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
  async getLocationPrimeTable(
    @Query('lazyEvent') parameter: string,
    @Res({ passthrough: true }) res,
  ) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.locationService.getLocationPrimeTable({
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
  //@UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Detail Location Item',
    description: '',
  })
  @Get(':_id/detail')
  async detail_customer(@Param() parameter) {
    return await this.locationService.detailLocation(parameter._id);
  }

  //=============================================================================BUCKET
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperations.BucketAdd)
  @Post('bucket')
  async add_bucket(
    @Body() data: bucketAddDTO,
    @CredentialAccount() credential: Account,
    @Req() req,
  ): Promise<bucketResDTO> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    console.log('=== DTO BUCKET MANAGEMENT ===', data);
    return await this.locationService.addBucket(data, accountSet);
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperations.BucketDelete)
  @Delete('bucket/:_id/delete')
  async deleteBucket(@Param() param: bucketDeleteParamDTO) {
    return await this.locationService.deleteBucket(param);
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperations.BucketDelete)
  @Delete('bucket/bulk-delete')
  async deleteBucketBulk(@Body() data: bucketBulkDeleteQueryDTO) {
    return await this.locationService.deleteBucketBulk(data);
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperations.BucketUpdate)
  @Put('bucket/:_id/edit')
  async editBucket(
    @Body() data: bucketUpdateBodyDTO,
    @Param() param: bucketUpdateParamDTO,
    @CredentialAccount() credential: Account,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.locationService.editBucket(data, param, accountSet);
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperations.BucketReadPrime)
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example: `{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}`,
    description: 'Format: Prime default param',
    required: false,
  })
  @Get('bucket-prime')
  async all(
    @Query('lazyEvent') parameter: string,
    @CredentialAccount() credential: Account,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.locationService.getBucketPrime(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        accountSet,
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperations.BucketView)
  @Get('bucket/:_id/view')
  async viewBucket(@Param() param: bucketDeleteParamDTO) {
    return await this.locationService.viewBucket(param);
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Import new Location item',
    description: 'Import new Location item',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/location/',
      storage: diskStorage({
        destination: './uploads/location/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          const time = curr_date[1].split('.')[0].replace(/:/g, '-');
          cb(null, `PRG_${curr_date[0]}_${time}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @Post('import')
  async upload_msisdn_list(
    @Body() parameter: LocationImportDto,
    @UploadedFile() file: Express.Multer.File,
    @CredentialAccount() account,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });

    this.clientLocationKafka.emit('location', {
      data_source: parameter.data_source,
      file: file,
      credential: accountSet,
    });
    const response = new GlobalResponse();
    response.transaction_classify = 'LOCATION_IMPORT';
    response.message = 'Import Location successfully';
    response.statusCode = HttpStatus.OK;
    return response;
    // if (file) {
    //   return await this.locationService.import_location(
    //     credential,
    //     file
    //   )
    // } else {
    //   throw new Error('No file found');
    // }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Import new Location item',
    description: 'Import new Location item',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/location/v2/',
      storage: diskStorage({
        destination: './uploads/location/v2/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          const time = curr_date[1].split('.')[0].replace(/:/g, '-');
          cb(null, `LOC_${curr_date[0]}_${time}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @Post('import-v2')
  async import_file(
    @CredentialAccount() credential,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.locationService.importLocationV2(`./${file.path}`);

    const response = new GlobalResponse();
    response.transaction_classify = 'LOCATION_IMPORT';
    response.message = 'Import Location successfully';
    response.statusCode = HttpStatus.OK;
    return response;
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Import new Location item from HRIS & SIAD',
    description: 'Import new Location item from HRIS & SIAD',
  })
  @Post('import-hris-siad')
  async import_file_hris_siad(@Request() request) {
    const files = request.body.file;
    const uploadedPath = [];

    try {
      const path = './uploads/location/hris-siad';
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const filename = `LOC_HRIS_SIAD_${curr_date[0]}_${time}`;

      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }

      for (const file of files) {
        const writePath = `${path}/${filename}${extname(file.filename)}`;
        fs.writeFileSync(writePath, file.data);
        uploadedPath.push(writePath);
      }

      this.locationService.importLocationHRISSIAD(uploadedPath[0]);
    } catch (err) {
      console.error(err);
    }

    const response = new GlobalResponse();
    response.transaction_classify = 'LOCATION_IMPORT';
    response.message = 'Import Location successfully';
    response.statusCode = HttpStatus.OK;
    return response;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Import new Location Timezone item',
    description: 'Import new Location Timezone item',
  })
  @ApiConsumes('multipart/form-data')
  @Post('import-timezone')
  async import_location_timezone(
    @CredentialAccount() credential,
    @Req() request: FastifyRequest,
  ) {
    const response = new GlobalResponse();

    try {
      const payload = new LocationImportTimezoneDTO(request.body);
      const filePath = './uploads/location/timezone';
      let fileWrite = "";

      for await (const file of payload.file) {
        const curr_date = new Date().toISOString().split('T');
        const time = curr_date[1].split('.')[0].replace(/:/g, '-');
        const fileName = `LOC_TIMEZONE_${curr_date[0]}_${time}${extname(file.filename)}`
        if (!fileName.match(/^.*\.(csv|txt)$/)) {
          throw new BadRequestException(["File format not support"]);
        }

        fileWrite = `${filePath}/${fileName}`;
        fs.writeFile(fileWrite, file.data, err => {
          if (err) {
            return console.log(err);
          }
        })
      }

      await this.locationService
        .importLocationTimezone(fileWrite)
        .then(_ => {});

      response.transaction_classify = 'LOCATION_TIMEZONE_IMPORT';
      response.message = 'Import Location Timezone successfully';
      response.statusCode = HttpStatus.OK;
      return response;
    } catch (e) {
      console.log(e);

      response.transaction_classify = 'LOCATION_TIMEZONE_IMPORT';
      response.message = 'Import Location Timezone fail';
      response.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      return response;
    }

  }
}
