import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { InventoryQuery } from '@/inventory/dtos/inventory.query';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiParamInventory, ApiQueryInventory } from '@/inventory/dtos/inventory.property.dto'
import { ProductSubcategoryService } from '../services/product-subcategory.service';
import { ProductSubcategoryRequestDto } from '../dtos/product-subcategory.dto';
import { ProductSubcategoryAddResponse, ProductSubcategoryResponse, ProductSubcategorySingleResponse, ProductSubcategoryUpdateResponse } from '../dtos/product-subcategory.response';
import { ProductSubategoryUpdateRequestDto } from '../dtos/product-subcategory.request';

@ApiTags('Inventory Product Subcategory')
@Controller({ path: 'product-subcategory', version: '1' })
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class ProductSubcategoryController {
  private productSubcategoryService: ProductSubcategoryService;

  constructor(
    productSubcategoryService: ProductSubcategoryService,
  ) {
    this.productSubcategoryService = productSubcategoryService;
  }

  @ApiOperation({
    summary: 'API For Find Product Subcategory.',
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
    type: ProductSubcategoryResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get()
  async get_product_subcategory(@Query() query, @Req() req: Request) {
    const token = req.headers.authorization;
    const inventoryQuery: InventoryQuery = query;
    return await this.productSubcategoryService.get_product_subcategory(inventoryQuery, token);
  }

  @ApiOperation({
    summary: 'API For Find Product Subcategory by ID.',
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
    type: ProductSubcategorySingleResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get(':id')
  async get_product_subcategory_by_id(@Query() query, @Param('id') id: string, @Req() req: Request) {
    const token = req.headers.authorization;
    const inventoryQuery: InventoryQuery = query;
    return await this.productSubcategoryService.get_product_subcategory_by_id(inventoryQuery, token, id);
  }

  @ApiOperation({
    summary: 'Add new product subcategory.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiProperty({
    type: ProductSubcategoryRequestDto
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductSubcategoryAddResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post()
  async post_product_subcategory(
    @Body() payload: ProductSubcategoryRequestDto, 
    @Req() req: Request, 
    @CredentialAccount() account) {
    const token = req.headers.authorization;
    return await this.productSubcategoryService.post_product_subcategory(payload, token, account);
  }

  @ApiOperation({
    summary: 'Update product subcategory.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam(ApiParamInventory.id)
  @ApiProperty({
    type: ProductSubategoryUpdateRequestDto
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductSubcategoryUpdateResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Patch(':id')
  async patch_product_subcategory(@Body() payload: ProductSubategoryUpdateRequestDto, @Param('id') id: string, @Req() req: Request) {
    const token = req.headers.authorization;
    return await this.productSubcategoryService.patch_product_subcategory(payload, token, id);
  }

  @ApiOperation({
    summary: 'Delete product subcategory.',
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
  async delete_product_subcategory(@Query('merchant_id') merchant_id: string, @Param('id') id: string, @Req() req: Request) {
    const token = req.headers.authorization;
    return await this.productSubcategoryService.delete_product_subcategory(id, merchant_id, token);
  }
}
