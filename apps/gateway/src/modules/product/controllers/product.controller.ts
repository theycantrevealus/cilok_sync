import {
  Controller,
  Get,
  HttpException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AxiosError } from 'axios';
import { catchError, map, Observable, throwError } from 'rxjs';

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import { ProductService } from '../services/product.service';

@Controller('product')
@ApiTags('Product Management')
@Controller('product')
export class ProductController {
  private productService: ProductService;
  private logService: LogOauthSignInService;

  constructor(
    productService: ProductService,
    logService: LogOauthSignInService,
  ) {
    this.productService = productService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'search_term',
    type: String,
    example: '',
    description: 'Search Parameter',
    required: false,
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
  @ApiQuery({
    name: 'projection',
    type: String,
    example: '{}',
    description: 'Spesific column set',
    required: false,
  })
  @ApiQuery({
    name: 'addon',
    type: String,
    example: '{}',
    description: 'Spesific column set (projection and addon)',
    required: false,
  })
  @ApiOperation({
    summary: 'List All Product Master Data',
    description: 'Integrated with core API /products endpoint',
  })
  @Get()
  async index(
    @Req() req,
    @Query('search_term') search_term: string,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('projection') projection: string,
    @Query('addon') addon: string,
  ): Promise<Observable<any>> {
    return await this.productService
      .getProduct({
        search_term: search_term,
        auth: req.headers.authorization,
        limit: limit,
        filter: filter,
        sort: sort,
        skip: skip,
        projection: projection,
        addon: addon,
      })
      .pipe(
        map((response) => {
          this.logService.logResponse(this.productService.getUrl(), response);
          return response.data;
        }),
        catchError((err: AxiosError<any, any>) => {
          this.logService.logResponse(
            this.productService.getUrl(),
            err.response,
          );

          return throwError(
            () => new HttpException(err.response.data, err.response.status),
          );
        }),
      );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'search_term',
    type: String,
    example: '',
    description: 'Search Parameter',
    required: false,
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
  @ApiQuery({
    name: 'projection',
    type: String,
    example: '{}',
    description: 'Spesific column set',
    required: false,
  })
  @ApiQuery({
    name: 'addon',
    type: String,
    example: '{}',
    description: 'Spesific column set (projection and addon)',
    required: false,
  })
  @ApiOperation({
    summary: 'List All Product Master Data',
    description: 'Integrated with core API /products endpoint',
  })
  @Get('selectbox')
  async selection(
    @Req() req,
    @Query('search_term') search_term: string,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('projection') projection: string,
    @Query('addon') addon: string,
  ): Promise<Observable<any>> {
    return await this.productService
      .getProduct({
        search_term: search_term,
        auth: req.headers.authorization,
        limit: limit,
        filter: filter,
        sort: sort,
        skip: skip,
        projection: projection,
        addon: addon,
      })
      .pipe(
        map((response) => {
          this.logService.logResponse(this.productService.getUrl(), response);
          const product_result = response.data.payload.products[0].result;
          return product_result;
        }),
        catchError((err: AxiosError<any, any>) => {
          this.logService.logResponse(
            this.productService.getUrl(),
            err.response,
          );

          return throwError(
            () => new HttpException(err.response.data, err.response.status),
          );
        }),
      );
  }
}
