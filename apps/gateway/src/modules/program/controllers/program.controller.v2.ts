import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Request,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Queue } from 'bull';
import { isJSON } from 'class-validator';
import { FastifyRequest } from 'fastify';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { ApiResponseExample } from '@/dtos/property.dto';
import {
  AllExceptionsFilter,
  RequestValidatorFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ProgramEditDTO,
  ProgramEditDTOResponse,
} from '@/program/dto/program.edit.dto.v2';
import {
  ProgramEditMainInfoDTO,
  ProgramEditMainInfoDTOResponse,
} from '@/program/dto/program.edit.main.info.dto.v2';
import {
  ProgramNotificationEditDTO,
  ProgramNotificationEditDTOResponse,
} from '@/program/dto/program.edit.notification.dto.v2';
import {
  ProgramTemplistAddDTO,
  ProgramTemplistAddDTOResponse,
} from '@/program/dto/program.templist.add';
import { ProgramImportWBDto } from '@/program/dto/program.wb.dto';
import { ProgramV2 } from '@/program/models/program.model.v2';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';

import { ProgramAddDTO } from '../dto/program.add.dto.v2';
import { ProgramChangeOwnerDTO } from '../dto/program.change.owner.dto';
import { ProgramIsDraftEditDTO } from '../dto/program.edit.isdraft.dto';
import { programSegmentationBulkDeleteBodyDto } from '../dto/program.segmentation.dto';
import { ProgramNotification } from '@/program/models/program.notification.model.v2';

@Controller({ path: 'program', version: '2' })
@ApiTags('Program Management')
@UseFilters(AllExceptionsFilter)
export class ProgramControllerV2 {
  private programService: ProgramServiceV2;
  protected programQueue: Queue;

  constructor(
    @Inject(AccountService) private readonly accountService: AccountService,
    programService: ProgramServiceV2,
    @InjectQueue('program') programQueue: Queue,
  ) {
    this.programService = programService;
    this.programQueue = programQueue;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Program Name Check',
    description: 'Check if program name is available to use',
  })
  @ApiQuery({
    name: 'program_name',
    type: String,
    example: '',
    description: 'Check if program code is available',
    required: false,
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('check_name')
  async checkProgramUnique(@Req() req, @Query('program_name') name: string) {
    return await this.programService.checkUniqueProgram({
      name: name,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new program item',
    description: 'Add new program item',
  })
  @ApiConsumes('multipart/form-data')
  @Post('segmentation')
  async upload_msisdn_list(
    @CredentialAccount() credential: Account,
    @Request() req: FastifyRequest,
    @Query('identifier') identifier: string,
  ) {
    const payload: ProgramImportWBDto = new ProgramImportWBDto(req.body);
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    const files = payload.file;
    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `PRG_${curr_date[0]}_${time}${extname(file.filename)}`;
      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException(['File format not support']);
      }
      fs.writeFile(`./uploads/program/${fileName}`, file.data, (err) => {
        if (err) {
          return console.log(err);
        }
      });
      file.path = `./uploads/program/${fileName}`;
      payload.file = { ...file, filename: fileName };
      return await this.programService
        .addProgramSegmentation(
          file,
          payload.program,
          payload.type,
          // payload.identifier,
          identifier,
          accountSet,
        )
        .catch((e) => {
          return e;
        });
    }

    /*
    const parameter: ProgramImportWBDto = new ProgramImportWBDto(req.body);
    const files = parameter.file;
    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `PRG_${curr_date[0]}_${time}${extname(file.filename)}`
      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException(["File format not support"]);
      }
      fs.writeFile(`${__dirname}/uploads/program/${fileName}`, file.data, err => {
        if (err) {
          return console.log(err);
        }
      })
      file.path = `${__dirname}/uploads/program/${fileName}`
      const accountSet: any = await this.accountService.authenticateBusiness({
        auth: req.headers.authorization,
      });

      if (file) {
        return await this.programService.addProgramSegmentation(
          file,
          parameter.program,
          parameter.type,
          accountSet,
        );
      } else {
        throw new Error('No file found');
      }
    }
    */
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new program',
    description: 'Add new program',
  })
  @UseInterceptors(LoggingInterceptor)
  // @UsePipes(ValidationPipe)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post()
  async add(
    @Body() parameter: ProgramAddDTO,
    @CredentialAccount() credential: Account,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.programService.addProgram(
      parameter,
      accountSet,
      req.headers.authorization,
    );
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
    summary: 'Add new program notification',
    description: 'Add new program notification',
  })
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post('notification')
  async addProgramNotification(
    @Body() parameter: ProgramNotification,
    @CredentialAccount() credential: Account,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.programService.addProgramNotification(
      parameter,
      accountSet,
    );
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
    summary: 'Edit program value',
    description: 'Edit program value by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit')
  async edit(
    @Body() data: ProgramV2,
    @Param() param,
    @CredentialAccount() account: any,
    @Req() req,
  ): Promise<ProgramEditDTOResponse> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.programService.editProgram(data, param._id, accountSet);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Edit program main info value',
    description: 'Edit program main info value by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit/main-info')
  async editMainInfo(
    @Body() data: ProgramEditMainInfoDTO,
    @Param() param,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<ProgramEditMainInfoDTOResponse> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    console.log('=== ACCOUNT SET === ', accountSet);
    return await this.programService.editMainInfo(data, param._id, accountSet);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete program item',
    description: 'Delete program item by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':_id/delete')
  async delete(@Param() parameter) {
    return await this.programService.deleteProgram(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete program notification item',
    description: 'Delete notification from program item by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('notification/:_id/delete')
  async delete_notification(@Param() parameter) {
    return await this.programService.deleteProgramNotification(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @UsePipes(ValidationPipe)
  @ApiOperation({
    summary: 'Edit Notifications of Program',
    description: 'Edit notifications of program by ID Notification',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put('edit/notification')
  async editNotification(
    @Body() payload: ProgramNotificationEditDTO,
  ): Promise<ProgramNotificationEditDTOResponse> {
    return await this.programService.editNotification(payload);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Find program item by ID',
    description: 'Showing detail of program without program parent detail',
  })
  @ApiParam({
    name: '_id',
  })
  @Get(':_id/detail')
  async findProgramById(@Param() parameter) {
    return await this.programService.findProgramById(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Find program item by Name',
    description: 'Showing detail of program without program parent detail',
  })
  @ApiParam({
    name: 'name',
  })
  @Get(':name/name')
  async findProgramByName(@Param() parameter) {
    return await this.programService.getProgramByName(parameter.name);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show all program item',
    description:
      'Showing all program without program parent detail and with some param for server-side request',
  })
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
      'You can define searching operator. ex: {"group_name":"%group_name_one%"}',
    required: false,
  })
  @ApiQuery({
    name: 'search_param',
    type: String,
    example: '',
    description: 'Universal keyword search',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @Get()
  async getProgram(
    @Query('search_param') search_param: string,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @CredentialAccount() account: any,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.programService.getProgram(
      {
        search_param: search_param,
        limit: limit,
        filter: filter,
        sort: sort,
        skip: skip,
      },
      accountSet,
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
  async getProgramPrimeTable(
    @Query('lazyEvent') parameter: string,
    @Req() req,
    @CredentialAccount() account: any,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.programService.getProgramPrimeTable(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        account,
        req.headers.authorization,
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiQuery({
    name: 'type',
    type: String,
    enum: ['whitelist', 'blacklist'],
    example: 'whitelist',
    description: 'List type',
    required: true,
  })
  @ApiQuery({
    name: 'program',
    type: String,
    example: '',
    description: 'Program OID',
    required: true,
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
  @Get('segmentation')
  async getProgramTemp(
    @Query('lazyEvent') parameter: string,
    @Query('type') type: string,
    @Query('identifier') identifier: string,
    @Query('program') program: string,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.programService.getProgramTemp(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        program,
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
  @ApiOperation({
    summary: 'Check msisdn existing',
    description: '',
  })
  @ApiQuery({
    name: 'msisdn',
    type: String,
    example: '6285261510201',
    description: 'Subscriber number',
    required: true,
  })
  @ApiQuery({
    name: 'program_id',
    type: String,
    example: '',
    description: 'Program OID',
    required: true,
  })
  @Get('segmentation/check-exist')
  async msisdn_check_existing(
    @Query('msisdn') msisdn: string,
    @Query('program_id') program: string,
  ) {
    return await this.programService.checkmsisdnExist(msisdn, program);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Add Program Temp List',
    description: 'Single create Whitelist/Blacklist MSISDN Program',
  })
  @Post('segmentation/add')
  async addProgramTempList(
    @Body() parameter: ProgramTemplistAddDTO,
    @CredentialAccount() credential,
    @Req() req,
    @Query('identifier') identifier: string,
  ): Promise<ProgramTemplistAddDTOResponse> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    delete parameter.identifier;
    console.log(
      `===========================================>>> \n ${JSON.stringify(
        {
          identifier: identifier,
          ...parameter,
        },
        null,
        2,
      )}`,
    );
    return await this.programService.addProgramTempList(
      {
        identifier: identifier,
        ...parameter,
      },
      accountSet,
    );
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new program item',
    description: 'Add new program item',
  })
  @ApiConsumes('multipart/form-data')
  // @UseInterceptors(LoggingInterceptor)
  @Post('upload_check')
  async upload(@CredentialAccount() credential, @Req() req: FastifyRequest) {
    const parameter: ProgramImportWBDto = new ProgramImportWBDto(req.body);
    const files = parameter.file;
    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const fileName = `PRG.${curr_date[0]}.${curr_date[1]}${extname(
        file.originalname,
      )}`;
      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException(['File format not support']);
      }
      fs.writeFile(
        `${__dirname}/uploads/programuploads/program/${fileName}`,
        file.data,
        (err) => {
          if (err) {
            return console.log(err);
          }
        },
      );
      file.path = `${__dirname}/uploads/program/${fileName}`;
      return {
        response: parameter,
        file: file,
      };
    }
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(false)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation({
  //   summary: 'Show whitelist / blacklist by program',
  //   description: 'Showing all program whitelist / blacklist by program',
  // })
  // @ApiQuery({
  //   name: 'program',
  //   type: String,
  //   example: '',
  //   description: 'Program ID Parent',
  //   required: true,
  // })
  // @ApiQuery({
  //   name: 'type',
  //   type: String,
  //   enum: ['whitelist', 'blacklist'],
  //   example: 'whitelist',
  //   description: 'List type',
  //   required: true,
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   type: Number,
  //   example: 10,
  //   description: 'Limit data to show',
  //   required: false,
  // })
  // @ApiQuery({
  //   name: 'skip',
  //   type: Number,
  //   example: 0,
  //   description: 'Offset',
  //   required: false,
  // })
  // @ApiQuery({
  //   name: 'filter',
  //   type: String,
  //   example: '{}',
  //   description:
  //     'You can define searching operator. ex: {"group_name":"%group_name_one%"}',
  //   required: false,
  // })
  // @ApiQuery({
  //   name: 'sort',
  //   type: String,
  //   example: '{}',
  //   description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
  //   required: false,
  // })
  // @UseInterceptors(LoggingInterceptor)
  // @Get('segmentation/:program/list')
  // async getProgramTempPerProgram(
  //   @Req() req,
  //   @Query('limit') limit: number,
  //   @Query('skip') skip: number,
  //   @Query('filter') filter: string,
  //   @Query('sort') sort: string,
  //   @Query('type') type: string,
  //   @Query('program') program: string,
  // ) {
  //   return await this.programService.getProgramWBlist(
  //     {
  //       limit: limit,
  //       filter: filter,
  //       sort: sort,
  //       skip: skip,
  //     },
  //     type,
  //     program,
  //   );
  // }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Delete program temp whitelist/blacklist item',
    description: 'Delete program list item by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @Delete('segmentation/:_id/delete')
  async delete_temp_list(@Param() parameter) {
    return await this.programService.deleteProgramTempList(parameter._id);
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Bulk delete program temp whitelist/blacklist item',
    description: 'Bulk delete program list item by ID',
  })
  @ApiResponse(ApiResponseExample.R204)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Delete('segmentation/bulk-delete')
  async deleteBulkProgramTempList(
    @Param() param,
    @Query() query,
    @Body() data: programSegmentationBulkDeleteBodyDto,
  ) {
    return await this.programService.deleteBulkProgramTempList({
      identifier: param.identifier ?? query.identifier,
      ...data,
    });
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Delete all unmatch program temp whitelist/blacklist item',
    description: 'Delete all unmatch program list item by ID',
  })
  @ApiResponse(ApiResponseExample.R204)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Delete('segmentation/delete-all-unmatch')
  async deleteUnmatchProgramTempList(
    @Body() data: programSegmentationBulkDeleteBodyDto,
    @Query('identifier') identifier: string,
  ) {
    return await this.programService.deleteUnmatchProgramTempList({
      identifier: identifier,
      ...data,
    });
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
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show all program item',
    description:
      'Showing all program without program parent detail and with some param for server-side request',
  })
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
  // @UseInterceptors(LoggingInterceptor)
  @Get('selectbox')
  async getProgramSelection(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.programService.getProgramSelection({
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
  @ApiOperation({
    summary: 'Program approval',
    description: 'Program approval',
  })
  @ApiParam({
    name: 'program',
    type: String,
    example: '',
    description: 'Program id to approve',
    required: true,
  })
  @ApiQuery({
    name: 'reason_approve',
    type: String,
    example: '',
    description: '',
    required: false,
  })
  @Patch(':program/approve')
  async approveProgram(
    @Param() param,
    @Query() reason_approve,
    @CredentialAccount() credential,
    @Req() req,
  ) {
    return await this.programService.approveProgram(
      param.program,
      credential,
      reason_approve.reason_approve,
      req.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Program rejection',
    description: 'Program rejection',
  })
  @ApiParam({
    name: 'program',
    type: String,
    example: '',
    description: 'Program id to approve',
  })
  @ApiQuery({
    name: 'reason_reject',
    type: String,
    example: '',
    description: '',
    required: false,
  })
  @Patch(':program/reject')
  async rejectProgram(
    @Param() param,
    @Query() reason_reject,
    @CredentialAccount() credential,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });

    return await this.programService.rejectProgram(
      param.program,
      accountSet,
      reason_reject.reason_reject,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show all program item with exception',
    description:
      'Showing all program without program parent detail and with some param for server-side request with exception data by ID',
  })
  @ApiQuery({
    name: 'except',
    type: String,
    example: '62ea4cb21590f471f099faf2',
    description: 'ID of program',
    required: true,
  })
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
  // @UseInterceptors(LoggingInterceptor)
  @Get('except')
  async getProgramWithExcept(
    @Req() req,
    @Query('except') except: string,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.programService.getProgramWithExcept({
      except: except,
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Check Program Name existing',
    description: '',
  })
  @ApiParam({
    name: 'program_name',
  })
  @Get(':program_name/check-existing')
  async program_check_existing(@Param() parameter) {
    return await this.programService.checkUniqueProgramV2(
      parameter.program_name,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Edit program Is Draft value',
    description: 'Edit program Is Draft value by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit/draft')
  async editisDraft(@Body() data: ProgramIsDraftEditDTO, @Param() param) {
    return await this.programService.editisdraft(param._id, data);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Program is stop/resume',
    description: '',
  })
  @ApiParam({
    name: '_id',
  })
  @Put(':_id/stop')
  async findProgramStop(@Req() parameter, @Res({ passthrough: true }) res) {
    const id = parameter.params._id;
    return await this.programService.stopProgram(id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'ChangeOwner Or Change Creator Program',
    description: 'ChangeOwner Or Change Creator Program',
  })
  @UseInterceptors(LoggingInterceptor)
  // @UsePipes(ValidationPipe)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post('change-owner')
  async changeOwner(@Body() parameter: ProgramChangeOwnerDTO) {
    return await this.programService.changeProgramOwner(parameter);
  }
}
