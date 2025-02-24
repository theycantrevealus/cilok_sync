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
  UseFilters,
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
import { extname, join } from 'path';
import { Observable, of } from 'rxjs';

import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { Authorization } from '../../decorators/auth.decorator';
import { OAuth2Guard } from '../../guards/oauth.guard';
import { MerchantPatnerAddDTO } from '../dto/merchant.patner.add.dto';
import { MerchantPatnerEditDTO } from '../dto/merchant.patner.edit.dto';
import { MerchantPatnerService } from '../services/merchant.patner.service';
import {   RequestValidatorFilter } from '@/filters/validator.filter';
import { isJson } from '@/application/utils/JSON/json';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
@Controller({ path: 'merchant-patner', version: '1' })
@ApiTags('Merchant Patner Management')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class MerchantPatnerController {
  private MerchantpatnerService: MerchantPatnerService;

  constructor(MerchantpatnerService: MerchantPatnerService) {
    this.MerchantpatnerService = MerchantpatnerService;
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // // @UseInterceptors(LoggingInterceptor)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation(ApiOperationExample.primeDT)
  // @ApiQuery(ApiQueryExample.primeDT)
  // @Get('prime')
  // async get_merchant_prime(@Query('lazyEvent') parameter: string) {
  //   const lazyEvent = parameter;

  //   if (isJson(lazyEvent)) {
  //     const parsedData = JSON.parse(parameter);
  //     return await this.MerchantpatnerService.get_patner_prime({
  //       first: parsedData.first,
  //       rows: parsedData.rows,
  //       sortField: parsedData.sortField,
  //       sortOrder: parsedData.sortOrder,
  //       filters: parsedData.filters,
  //     });
  //   } else {
  //     return {
  //       message: 'filters is not a valid json',
  //       payload: {},
  //     };
  //   }
  // }
  
  @UseGuards(OAuth2Guard)
  // @UseInterceptors(LoggingInterceptor)
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
    summary: 'List all bank',
    description:
      'Bank (List of values) used to store all default value or selection collection that rarely changes',
  })
  @Get()
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.MerchantpatnerService.get_merchant({
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
    summary: 'Add new merchant patner item',
    description: 'Add new merchant patner item',
  })
  @UseInterceptors(LoggingInterceptor)
  @UseInterceptors(
    FileInterceptor('partner_logo', {
      dest: './uploads/merchant-patner/',
      storage: diskStorage({
        destination: './uploads/merchant-patner/',
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
  @UseInterceptors(LoggingInterceptor)
  @Post()
  async add(
    @Body() data: MerchantPatnerAddDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.MerchantpatnerService.add(data, file);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: 'imagename',
  })
  @Get(':imagename')
  getFile(@Param() param, @Res() res): Observable<any> {
    return of(
      res.sendFile(
        join(process.cwd(), 'uploads/merchant-patner/' + param.imagename),
      ),
    );
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
  @UseInterceptors(
    FileInterceptor('partner_logo', {
      dest: './uploads/merchant-patner/',
      storage: diskStorage({
        destination: './uploads/merchant-patner/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          cb(
            null,
            // `MRP.jpg`,
            `MRP.${curr_date[0]}.${curr_date[1]}${extname(file.originalname)}`,
          );
          // cb(null, file.originalname);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit')
  async edit(
    @Body() data: MerchantPatnerEditDTO,
    @UploadedFile() file: Express.Multer.File,
    @Param() param,
  ) {
    return await this.MerchantpatnerService.edit(data, file, param._id);
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
    return await this.MerchantpatnerService.delete(param._id);
  }

}
