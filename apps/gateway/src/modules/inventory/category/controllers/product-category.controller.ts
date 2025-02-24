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
import { Request } from 'express';

import { AccountService } from '@/account/services/account.service';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ApiParamInventory,
  ApiQueryInventory,
} from '@/inventory/dtos/inventory.property.dto';
import { InventoryQuery } from '@/inventory/dtos/inventory.query';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';

import {
  ProductCategoryRequestDto,
  ProductCategoryUpdateRequestDto,
} from '../dtos/product-category.dto';
import {
  ProductCategoryAddResponse,
  ProductCategoryResponse,
  ProductCategorySingleResponse,
  ProductCategoryUpdateResponse,
} from '../dtos/product-category.response';
import { ProductCategoryService } from '../services/product-category.service';

@ApiTags('Inventory Product Category')
@Controller({ path: 'product-category', version: '1' })
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class ProductCategoryController {
  private productCategoryService: ProductCategoryService;

  constructor(
    @Inject(AccountService) private readonly accountService: AccountService,
    productCategoryService: ProductCategoryService,
  ) {
    this.productCategoryService = productCategoryService;
  }

  @ApiOperation({
    summary: 'API For Find Product Category.',
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
    type: ProductCategoryResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get()
  async get_product_category(@Query() query, @Req() req: Request) {
    const token = req.headers.authorization;
    const inventoryQuery: InventoryQuery = query;
    return await this.productCategoryService.get_product_category(
      inventoryQuery,
      token,
    );
  }

  @ApiOperation({
    summary: 'API For Find Product Category by ID.',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam(ApiParamInventory.id)
  @ApiQuery(ApiQueryInventory.multi_locale_flag)
  @ApiQuery(ApiQueryInventory.projection)
  @ApiQuery(ApiQueryInventory.addon)
  @ApiQuery(ApiQueryInventory.locale)
  @ApiQuery(ApiQueryInventory.merchant_id)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductCategorySingleResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get(':id')
  async get_product_category_by_id(
    @Query() query,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization;
    const inventoryQuery: InventoryQuery = query;
    return await this.productCategoryService.get_product_category_by_id(
      inventoryQuery,
      token,
      id,
    );
  }

  @ApiOperation({
    summary: 'Add new product category.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiProperty({
    type: ProductCategoryRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductCategoryAddResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post()
  async post_product_category(
    @Body() payload: ProductCategoryRequestDto,
    @Req() req: Request,
    @CredentialAccount() account,
  ) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    const token = req.headers.authorization;
    return await this.productCategoryService.post_product_category(
      payload,
      token,
      accountSet,
    );
  }

  @ApiOperation({
    summary: 'Update product category.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam(ApiParamInventory.id)
  @ApiProperty({
    type: ProductCategoryUpdateRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductCategoryUpdateResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Patch(':id')
  async patch_product_category(
    @Body() payload: ProductCategoryUpdateRequestDto,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization;
    return await this.productCategoryService.patch_product_category(
      payload,
      token,
      id,
    );
  }

  @ApiOperation({
    summary: 'Delete product category.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiQuery(ApiQueryInventory.merchant_id)
  @ApiParam(ApiParamInventory.id)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductCategoryUpdateResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Delete(':id')
  async delete_product_category(
    @Query('merchant_id') merchant_id: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization;
    return await this.productCategoryService.delete_product_category(
      id,
      merchant_id,
      token,
    );
  }
}
