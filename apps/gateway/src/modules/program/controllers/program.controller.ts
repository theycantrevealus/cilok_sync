import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
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
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import { ProgramAddDTO } from '../dto/program.add.dto';
import { ProgramEditDTO } from '../dto/program.edit.dto';
import { ProgramImportWBDto } from '../dto/program.wb.dto';
import { ProgramService } from '../services/program.service';

@Controller('program')
@ApiTags('Program Management')
export class ProgramController {
  private programService: ProgramService;
  private logService: LogOauthSignInService;

  constructor(
    programService: ProgramService,
    logService: LogOauthSignInService,
  ) {
    this.programService = programService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @UseInterceptors(LoggingInterceptor)
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
  @UseInterceptors(LoggingInterceptor)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/program/',
      storage: diskStorage({
        destination: './uploads/program/',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(LoggingInterceptor)
  @Post('import_list')
  async upload_msisdn_list(
    @Req() request,
    @Body() parameter: ProgramImportWBDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.programService.addProgramListTemp(
      file,
      parameter.type,
      request.clientIp,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new program item',
    description: 'Add new program item',
  })
  @UseInterceptors(LoggingInterceptor)
  // @ApiConsumes('multipart/form-data')
  @Post()
  async add(@Body() parameter: ProgramAddDTO, @Req() request) {
    //return await this.programService.addProgram(parameter, request.clientIp);
  }

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
  async edit(@Body() data: ProgramEditDTO, @Param() param) {
    return await this.programService.editProgram(data, param._id);
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
    summary: 'Delete program segmentation item',
    description: 'Delete segmentation from program item by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('segmentation/:_id/delete')
  async delete_segmentation(@Param() parameter) {
    return await this.programService.deleteProgramSegmentation(parameter._id);
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
  @ApiOperation({
    summary: 'Find program item by ID',
    description: 'Showing detail of program without program parent detail',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Get(':_id/detail')
  async findProgramById(@Param() parameter) {
    return await this.programService.findProgramById(parameter._id);
  }

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
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @Get()
  async getProgram(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.programService.getProgram({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show all program temporary whitelist / blacklist',
    description:
      'Showing all program temporary whitelist / blacklist by current account',
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
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @UseInterceptors(LoggingInterceptor)
  @Get('temp_list')
  async getProgramTemp(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.programService.getProgramTemp(
      {
        limit: limit,
        filter: filter,
        sort: sort,
        skip: skip,
      },
      req.clientIp,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show whitelist / blacklist by program',
    description: 'Showing all program whitelist / blacklist by program',
  })
  @ApiQuery({
    name: 'program',
    type: String,
    example: '',
    description: 'Program ID Parent',
    required: true,
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
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @UseInterceptors(LoggingInterceptor)
  @Get('segmentation/:program/list')
  async getProgramTempPerProgram(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('type') type: string,
    @Query('program') program: string,
  ) {
    return await this.programService.getProgramWBlist(
      {
        limit: limit,
        filter: filter,
        sort: sort,
        skip: skip,
      },
      type,
      program,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete program temp whitelist/blacklist item',
    description: 'Delete program list item by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete('temp_list/:_id/delete')
  async delete_temp_list(@Param() parameter) {
    return await this.programService.deleteProgramTempList(parameter._id);
  }

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
  @UseInterceptors(LoggingInterceptor)
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
  @UseInterceptors(LoggingInterceptor)
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
}
