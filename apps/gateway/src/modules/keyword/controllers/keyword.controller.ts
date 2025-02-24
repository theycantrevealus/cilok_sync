import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import { FastifyRequest } from 'fastify';
import { diskStorage, MulterError } from 'multer';
import { extname, join } from 'path';
import * as path from 'path';
import { Observable, of } from 'rxjs';

import { AccountService } from '@/account/services/account.service';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  ApiOperationExample,
  ApiQueryExample,
  ApiResponseExample,
} from '@/dtos/property.dto';
import { GlobalResponse } from '@/dtos/response.dto';
import { AllExceptionsFilter } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { KeywordUploadFileDto } from '@/keyword/dto/keyword.upload.file.dto';
import { Keyword } from '@/keyword/models/keyword.model';
import { KeywordService } from '@/keyword/services/keyword.service';

import { keyword } from '../../../../../../__tests__/mocks/redeem/deduct';
import { KeywordIsDraftEditDTO } from '../dto/keyword.edit.isdraft.dto';
import { ImageAuctionAddDTO } from '../dto/keyword.image.auction.add.dto';
import { RewardCatalogFilterDTO } from '../dto/reward.catalog.filter';

import * as fs from 'fs';
import { KeywordChangeOwnerDTO } from '../dto/keyword.change.owner.dto';

@Controller({ path: 'keyword' })
@UseFilters(AllExceptionsFilter)
@ApiTags('Keyword General Management')
export class KeywordController {
  private keywordService: KeywordService;

  constructor(
    keywordService: KeywordService,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {
    this.keywordService = keywordService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List Reward Catalog Xml',
  })
  @Version('2')
  @Get('reward-catalog')
  async list(@Query() filter: RewardCatalogFilterDTO) {
    console.log({ filter });
    return await this.keywordService.listRewardCatalogXml(filter);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Show all keyword item',
    description:
      'Showing all keyword without keyword parent detail and with some param for server-side request',
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
  @Version('1')
  @Get()
  async all_old(
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
    return await this.keywordService.all_old(
      {
        limit: limit,
        filter: filter,
        sort: sort,
        skip: skip,
      },
      accountSet,
    );
  }

  //
  //
  //
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @Version('2')
  @Get()
  async all(
    @Query('lazyEvent') parameter: string,
    @CredentialAccount() account: any,
    @Req() req,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.keywordService.all(
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
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @Version('1')
  @Get('segmentation')
  async segmentation(
    @Query('lazyEvent') parameter: string,
    @CredentialAccount() account: any,
  ) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.keywordService.segmentation(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        account,
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Get Keyword Detail',
    description: 'Return detail data of keyword configuration ',
  })
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Get(':_id/detail')
  async detail(@Param() parameter): Promise<any> {
    return await this.keywordService.detail(parameter._id);
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
    summary: 'Get Keyword Detail',
    description: 'Return detail data of keyword configuration ',
  })
  @ApiParam({
    name: '_id',
  })
  @Version('2')
  @Get(':_id/detail')
  async detail_v2(@Param() parameter): Promise<any> {
    return await this.keywordService.detailv2(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Get Keyword Detail',
    description: 'Return detail data of keyword configuration ',
  })
  @ApiParam({
    name: 'name',
  })
  @Version('1')
  @Get(':name/name')
  async find(@Param() parameter) {
    return await this.keywordService.findRegexKeywordByName(parameter.name);
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
    summary: 'Add new keyword item',
    description: 'Add new keyword item',
  })
  @Version('1')
  @Post()
  async add(
    @Body() parameter: Keyword,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalResponse> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.keywordService.add(parameter, accountSet);
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
    summary: 'Keyword approval',
    description: 'Keyword approval',
  })
  @ApiParam({
    name: 'keyword',
    type: String,
    example: '',
    description: 'Keyword id to approve',
    required: true,
  })
  @Version('1')
  @Patch(':keyword/approve')
  async approveKeyword(@Param() param, @CredentialAccount() credential) {
    return await this.keywordService.approveKeyword(param.keyword, credential);
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
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Keyword approval',
    description: 'Keyword approval',
  })
  @ApiParam({
    name: 'keyword',
    type: String,
    example: '',
    description: 'Keyword id to approve',
    required: true,
  })
  @ApiQuery({
    name: 'reason_approve',
    type: String,
    example: '',
    description: '',
    required: false,
  })
  @Version('2')
  @Patch(':keyword/approve')
  async approveKeywordV2(
    @Param() param,
    @Query() reason_approve,
    @CredentialAccount() credential,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.keywordService.approveKeywordV2(
      param.keyword,
      accountSet,
      reason_approve.reason_approve,
      req,
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Keyword rejection',
    description: 'Keyword rejection',
  })
  @ApiParam({
    name: 'keyword',
    type: String,
    example: '',
    description: 'Keyword id to reject',
    required: true,
  })
  @Version('1')
  @Patch(':keyword/reject')
  async rejectKeyword(@Param() param, @CredentialAccount() credential) {
    return await this.keywordService.rejectKeyword(param.keyword, credential);
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
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Keyword Rejection',
    description: 'Keyword rejection',
  })
  @ApiParam({
    name: 'keyword',
    type: String,
    example: '',
    description: 'Keyword id to reject',
    required: true,
  })
  @ApiQuery({
    name: 'reason_reject',
    type: String,
    example: '',
    description: '',
    required: false,
  })
  @Version('2')
  @Patch(':keyword/reject')
  async rejectKeywordV2(
    @Param() param,
    @Query() reason_reject,
    @CredentialAccount() credential,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.keywordService.rejectKeywordV2(
      param.keyword,
      accountSet,
      reason_reject.reason_reject,
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'Delete keyword',
    description: '',
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Delete(':_id/delete')
  async delete(@Param() parameter) {
    return await this.keywordService.delete(parameter._id);
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
    summary: 'Edit keyword',
    description: '',
  })
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Put(':_id/edit')
  async edit(
    @Param() parameter,
    @Body() request: Keyword,
    @CredentialAccount() account,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.keywordService.edit(parameter._id, request, accountSet);
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
    summary: 'Upload Prize Image for Auction',
    description: 'Upload Prize Image for Auction',
  })
  @UseInterceptors(LoggingInterceptor)
  @UseInterceptors(
    FileInterceptor('image', {
      dest: './uploads/images-auction/',
      storage: diskStorage({
        destination: './uploads/images-auction/',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @Version('2')
  @Post('image-auction')
  async imageUpload(
    @Body() data: ImageAuctionAddDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.keywordService.imageupload(data, file);
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
  @ApiOperation({
    summary: 'Get Image Prize Image for Auction',
    description: 'Get Image Prize Image for Auction',
  })
  @ApiParam({
    name: 'imagename',
  })
  @Version('2')
  @Get('image-auction/:imagename')
  getFile(@Param() param, @Res() res): Observable<any> {
    return of(
      res.sendFile(
        join(process.cwd(), 'uploads/images-auction/' + param.imagename),
      ),
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Get Keyword by Program Id',
    description: 'Return keyword by Program id',
  })
  @ApiParam({
    name: 'program_id',
  })
  @Version('2')
  @Get(':program_id')
  async detail_keyword_by_program_id(@Param() parameter) {
    return await this.keywordService.get_keyword_by_program_id(
      parameter.program_id,
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Check Keyword Name existing',
    description: '',
  })
  @ApiParam({
    name: 'keyword_name',
  })
  @ApiQuery({
    name: 'keyword_id',
    required: false,
    type: String,
    example: '63a007e696288302f500a4cb',
  })
  @Version('2')
  @Get(':keyword_name/check-existing')
  async keyword_check_existing(
    @Param() parameter,
    @Query('keyword_id') keyword_id: string,
  ) {
    return await this.keywordService.checkUniqueKeyword(
      parameter.keyword_name,
      keyword_id,
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
    summary: 'Edit keyword Is Draft value',
    description: 'Edit keyword Is Draft value by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Version('2')
  @Put(':_id/edit/draft')
  async editisDraft(
    @Body() data: KeywordIsDraftEditDTO,
    @Param() param,
    @Req() req,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.keywordService.editisdraft(param._id, data, accountSet);
  }

  @Post('upload-image/reward-catalog')
  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Upload file',
    description: 'Upload file',
  })
  @Version('2')
  @UseGuards(OAuth2Guard)
  @ApiConsumes('multipart/form-data')
  async upload_image_reward_catalog(
    @Req() request: FastifyRequest,
    @Param() parameter: any,
  ) {
    const body: KeywordUploadFileDto = new KeywordUploadFileDto(request.body);
    const files = body.file;
    for await (const file of files) {
      try {
        const fileName = file.filename;
        if (!fileName.match(/^.*\.(jpg|webp|png|jpeg)$/)) {
          throw new BadRequestException(['File format not support']);
        }
        fs.writeFile(
          `${__dirname}/uploads/keyword/reward_catalog/${fileName}`,
          file.data,
          (err) => {
            if (err) {
              return console.log(err);
            }
          },
        );
        file.path = `${__dirname}/uploads/keyword/reward_catalog/${fileName}`;
        return await this.keywordService.uploadImageRewardCatalog(body, file);
      } catch (error) {
        throw new BadRequestException(error.message);
      }
    }
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Keyword is stop/resume',
    description: '',
  })
  @ApiParam({
    name: '_id',
  })
  @Version('2')
  @Put(':_id/stop')
  async findKeywordStop(@Req() parameter, @Res({ passthrough: true }) res) {
    const id = parameter.params._id;
    return await this.keywordService.stopKeyword(id);
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
  async changeOwner(@Body() parameter: KeywordChangeOwnerDTO) {
    return await this.keywordService.changeKeywordOwner(parameter);
  }
}
