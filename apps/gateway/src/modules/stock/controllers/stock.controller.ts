import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  AllExceptionsFilter,


  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { InventoryQuery } from '@/inventory/dtos/inventory.query';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StockReserveDTO } from '../dto/stock-reserve.dto';
import { StockDTO } from '../dto/stock.dto';
import { StockResponse } from '../dto/stock.reponse';
import { StockService } from '../services/stock.service';

@ApiTags('Management Stock')
@Controller({ path: 'stocks', version: '1' })
@UseFilters(AllExceptionsFilter)
export class StockController {

  private stockService: StockService;
  constructor(stockService: StockService) {
    this.stockService = stockService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'search_param',
    type: String,
    example: '',
    description: 'keyword search for location name and product name',
    required: false,
  })
  @ApiOperation({
    summary: 'Show all stock',
    description:
      'Showing all stock data and detail',
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
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get()
  async get_stock(
    @Query('search_param') search_param: string,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.stockService.findStock({
      search_param: search_param,
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @ApiOperation({
    summary: 'Add new Stock.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiProperty({
    type: StockDTO
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: StockResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post()
  async post_new_stock(
    @Body() payload: StockDTO,
    @CredentialAccount() account
  ) {
    return await this.stockService.store(payload, account);
  }

  @ApiOperation({
    summary: 'Deduct Stock.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiProperty({
    type: StockDTO
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: StockResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Put()
  async put_new_stock(
    @Body() payload: StockDTO,
    @CredentialAccount() account
  ) {
    return await this.stockService.deduct(payload, account);
  }


  @ApiOperation({
    summary: 'Reserve Stock.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiProperty({
    type: StockReserveDTO
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: StockResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post('reserve')
  async post_reserve(
    @Body() payload: StockReserveDTO,
    @CredentialAccount() account
  ) {
    return await this.stockService.reserve(payload, account);
  }

  @ApiOperation({
    summary: 'Approve Reserve Stock.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: 'id',
    description:
      'Id Reserve',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: StockResponse
  })
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Patch('reserve/:id')
  async patch_approve_reserve(
    @Param('id') id: string,
    @CredentialAccount() account
  ) {
    return await this.stockService.approve_reserve(id, account);
  }


  @ApiOperation({
    summary: 'Actual Stocks.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: 'keyword_id',
    description: 'Id Keyword',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: StockResponse,
  })
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Get('actual-stock/:keyword_id')
  async actualStock(@Param('keyword_id') id: string) {
    return await this.stockService.actualStock(id);
  }
}
