import {
  Body,
  Controller,
  Post,
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

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import {
  InjectCouponDto,
  InjectPointDto,
  RedeemDto,
} from '@/inject/dto/inject.dto';
import { InjectService } from '@/inject/services/inject_service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

@Controller('inject')
@ApiTags('Inject Handler')
export class InjectController {
  constructor(private injectService: InjectService) {
    this.injectService = injectService;
  }

  @Post('coupon')
  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Inject coupon by upload file',
    description: 'Inject coupon by upload file',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/inject/coupon/',
      storage: diskStorage({
        destination: './uploads/inject/coupon/',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(LoggingInterceptor)
  async inject_coupon_upload_file(
    @Req() request,
    @Body() parameter: InjectCouponDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.injectService.uploadFile(
      file,
      parameter,
      request.clientIp,
      'inject-coupon',
    );
  }

  @Post('point')
  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Inject point by upload file',
    description: 'Inject point by upload file',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/inject/point/',
      storage: diskStorage({
        destination: './uploads/inject/point/',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(LoggingInterceptor)
  async inject_point_upload_file(
    @Req() request,
    @Body() parameter: InjectPointDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.injectService.uploadFile(
      file,
      parameter,
      request.clientIp,
      'inject-point',
    );
  }

  @Post('redeem')
  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Inject redeem by upload file',
    description: 'Inject redeem by upload file',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/redeem/',
      storage: diskStorage({
        destination: './uploads/redeem/',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(LoggingInterceptor)
  async inject_redeem_upload_file(
    @Req() request,
    @Body() parameter: RedeemDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.injectService.uploadFile(
      file,
      parameter,
      request.clientIp,
      'redeem',
    );
  }
}
