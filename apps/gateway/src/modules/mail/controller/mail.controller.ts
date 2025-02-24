import {Controller, Get, Query} from '@nestjs/common';
import {ApiOperation, ApiQuery, ApiTags} from "@nestjs/swagger";
import {MailService} from "@/mail/service/mail.service";

@Controller({ path: 'mail', version: '1'})
@ApiTags('Mail Feature')
export class MailController {
  private mailService: MailService

  constructor(
    mailService: MailService
  ) {
    this.mailService = mailService;
  }

  @ApiOperation({
    summary: 'Test send email',
    description: 'Test send email for make sure mail service has working'
  })
  @ApiQuery({
    name: 'email',
    type: String,
    example: 'you@mail.com',
    description: '',
    required: true,
  })
  @Get('test')
  async testEmail(@Query('email') email: string) {
    let emails = [];
    emails.push(email);
    return await this.mailService.sendMailConfirmation(emails)
  }
}
