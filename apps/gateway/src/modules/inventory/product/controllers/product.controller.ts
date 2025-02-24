import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { isJSON } from 'class-validator';
import { Request } from 'express';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {AllExceptionsFilter} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ApiParamInventory,
  ApiQueryInventory,
} from '@/inventory/dtos/inventory.property.dto';
import { InventoryQuery } from '@/inventory/dtos/inventory.query';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';

import {
  ProductRequestDto,
  ProductUpdateRequestDto,
} from '../dtos/product.request';
import {
  ProductAddAndUpdateResponse,
  ProductResponse,
  ProductUpdateResponse,
} from '../dtos/product.response';
import { ProductService } from '../services/product.service';
import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';

@ApiTags('Inventory Product')
@Controller({ path: 'product', version: '1' })
@UseFilters(AllExceptionsFilter)
export class ProductController {
  private productService: ProductService;

  constructor(
    @Inject(AccountService) private readonly accountService: AccountService,
    productService: ProductService,
  ) {
    this.productService = productService;
  }

  @ApiOperation({
    summary: 'API For Find Product.',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery(ApiQueryInventory.multi_locale_flag)
  @ApiQuery(ApiQueryInventory.filter)
  @ApiQuery(ApiQueryInventory.sort)
  @ApiQuery(ApiQueryInventory.projection)
  @ApiQuery(ApiQueryInventory.addon)
  @ApiQuery(ApiQueryInventory.limit)
  @ApiQuery(ApiQueryInventory.skip)
  @ApiQuery(ApiQueryInventory.search_term)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get()
  async get_products(@Query() query, @Req() req: Request) {
    const token = req.headers.authorization;
    const inventoryQuery: InventoryQuery = query;
    return await this.productService.get_product(inventoryQuery, token);
  }

  @ApiOperation({
    summary: 'API For Find Product by ID.',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam(ApiParamInventory.id)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get('detail/:id')
  async get_products_by_id(@Param('id') id: string, @Req() req: Request) {
    const token = req.headers.authorization;

    console.log('id_gak', id)
    return await this.productService.get_product_by_id_local(id, token);
  }

  @ApiOperation({
    summary: 'Add new product.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiProperty({
    type: ProductRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductAddAndUpdateResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post()
  async post_product(
    @Body() payload: ProductRequestDto,
    @Req() req: Request,
    @CredentialAccount() account: Account,
  ) {
    const token = req.headers.authorization;
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    return await this.productService.post_product(payload, token, accountSet);
  }

  @ApiOperation({
    summary: 'Update product.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam(ApiParamInventory.id)
  @ApiProperty({
    type: ProductRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductUpdateResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Patch(':id')
  async patch_product(
    @Body() payload: ProductUpdateRequestDto,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization;
    const res = await this.productService.patch_product(payload, token, id);
    return res;
  }

  @ApiOperation({
    summary: 'Delete product.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery(ApiQueryInventory.merchant_id)
  @ApiParam(ApiParamInventory.id)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Delete(':id')
  async delete_product(
    @Query('merchant_id') merchant_id: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization;
    return await this.productService.delete_product(id, merchant_id, token);
  }

  @ApiOperation({
    summary: 'get product prime.',
  })
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
  @Get('prime')
  async prime_all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      parsedData.filters.keyword = {value: null, matchMode: "contains"}
      return await this.productService.get_product_prime({
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
}
