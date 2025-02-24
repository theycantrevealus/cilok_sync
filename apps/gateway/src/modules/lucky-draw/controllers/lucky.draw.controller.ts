import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiOAuth2,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {FastifyRequest} from 'fastify';
import * as fs from 'fs';
import {extname} from 'path';

import {Account} from '@/account/models/account.model';
import {AccountService} from '@/account/services/account.service';
import {Authorization, CredentialAccount} from '@/decorators/auth.decorator';
import {
  AllExceptionsFilter,
} from '@/filters/validator.filter';
import {OAuth2Guard} from '@/guards/oauth.guard';
import {LuckyDrawService} from "@/lucky-draw/services/lucky.draw.service";
import {LuckyDrawUploadDto} from "@/lucky-draw/dto/lucky.draw.upload.dto";
@Controller({path: 'lucky-draw', version: '1'})
@ApiTags('Lucky Draw')
@UseFilters(
  AllExceptionsFilter
)
export class LuckyDrawController {
  constructor(
    @Inject(AccountService)
    private readonly accountService: AccountService,
    private readonly luckyDrawService: LuckyDrawService,
  ) {
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Lucky draw',
    description: 'Upload file lucky draw',
  })
  @ApiConsumes('multipart/form-data')
  @Post('upload-file')
  async lucky_draw_upload_file(
    @CredentialAccount() credential: Account,
    @Request() req: FastifyRequest,
  ) {

    const accounts:any = credential;
    console.log("lucky draw :: account")
    console.log(accounts._id)
    console.log("lucky draw :: account")

    const payload: LuckyDrawUploadDto = new LuckyDrawUploadDto(req.body);
    const files = payload.file;
    for await (const file of files) {
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `LD_${curr_date[0]}_${time}${extname(file.filename)}`
      if (!fileName.match(/^.*\.(csv|txt)$/)) {
        throw new BadRequestException(["File format not support"]);
      }
      fs.writeFile(`./uploads/lucky-draw/${fileName}`, file.data, err => {
        if (err) {
          return console.log(err);
        }
      })
      file.path = `./uploads/lucky-draw/${fileName}`
      payload.file = {...file, filename: fileName};
      return await this.luckyDrawService.uploadFileLuckyDraw(
        file,
        credential,
      ).catch((e) => {
        return e;
      });
    }
  }
}
