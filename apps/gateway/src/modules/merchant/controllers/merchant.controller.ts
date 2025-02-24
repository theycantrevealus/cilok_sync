import { InjectQueue } from '@nestjs/bull';
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
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import { MerchantAddDTO, MerchantBulkDTO } from '../dto/merchant.add.dto';
import { MerchantEditDTO } from '../dto/merchant.edit.dto';
import { MerchantService } from '../services/merchant.service';

@Controller({ path: 'merchant', version: '1' })
@ApiTags('Merchant Management')
export class MerchantController {
  private merchantService: MerchantService;
  private logService: LogOauthSignInService;

  constructor(
    merchantService: MerchantService,
    logService: LogOauthSignInService,
    @InjectQueue('merchant') private readonly merchantQueue: Queue,
  ) {
    this.merchantService = merchantService;
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
    summary: 'List all merchant',
    description:
      'Merchant (List of values) used to store all default value or selection collection that rarely changes',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get()
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.merchantService.getMerchant({
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
    summary: 'Add Merchant Item',
    description: 'group_name is used for grouping value',
  })
  @UseInterceptors(LoggingInterceptor)
  @Post()
  async add(
    @Body() parameter: MerchantAddDTO,
    @CredentialAccount() credential,
  ) {
    return await this.merchantService.addMerchant(parameter, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Merchant Item',
    description: 'Import merchant data',
  })
  @UseInterceptors(LoggingInterceptor)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/merchant/',
      storage: diskStorage({
        destination: './uploads/merchant/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          cb(
            null,
            `MCT.${curr_date[0]}.${curr_date[1]}${extname(file.originalname)}`,
          );
          // cb(null, file.originalname);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @Post('bulk')
  async upload_msisdn_list(
    @Req() request,
    @Body() parameter: MerchantBulkDTO,
    @UploadedFile() file: Express.Multer.File,
    @CredentialAccount() credential,
  ) {
    return await this.merchantService.addMerchantBulk(file, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Check import merchant process',
    description: 'Check import merchant process',
  })
  @Get('bulk/:id')
  async getJobResult(@Res() response, @Param('id') id: string) {
    const job = await this.merchantQueue.getJob(id);

    if (!job) {
      return { result: '' };
    }

    const isCompleted = await job.isCompleted();

    if (!isCompleted) {
      return { result: job.returnvalue };
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Merchant Item',
    description: 'group_name is used for grouping value',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit')
  async edit_customer(@Body() data: MerchantEditDTO, @Param() param) {
    return await this.merchantService.editMerchant(data, param._id);
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
  async delete_customer(@Param() parameter) {
    return await this.merchantService.deleteMerchant(parameter._id);
  }
}
