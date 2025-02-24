import {
  Controller,
  HttpStatus,
  Inject,
  Post, Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { ClientKafka } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalResponse } from '@/dtos/response.dto';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { MigrationService } from '@/migration/service';

@Controller('migration')
@ApiTags('Migration Tools')
export class MigrationController {
  constructor(
    @Inject(MigrationService)
    private readonly migrationService: MigrationService,
  ) {
    //
  }
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Import DCI',
    description: 'Import DCI',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/migration/dci/',
      storage: diskStorage({
        destination: './uploads/migration/dci/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T');
          const time = curr_date[1].split('.')[0].replace(/:/g, '-');
          cb(null, `MIG_${curr_date[0]}_${time}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @Post('import-dci')
  async import_file(
    @CredentialAccount() credential,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    await this.migrationService.import_dci(`./${file.path}`, req.headers.authorization);

    const response = new GlobalResponse();
    response.transaction_classify = 'MIGRATION_IMPORT';
    response.message = 'Import successfully';
    response.statusCode = HttpStatus.OK;
    return response;
  }
}
