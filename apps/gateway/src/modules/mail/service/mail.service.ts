import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendMailConfirmation(emails: string[], data: any = null) {
    const payloadMail = await this.buildPayloadMail(emails, data);
    return await this.mailerService.sendMail(payloadMail).catch((e) => {
      console.log(e);
    });
  }

  async buildPayloadMail(emaials: string[], data) {
    const payload = {
      to: emaials.toString(),
    };

    if (data.subject) {
      payload['subject'] = data.subject ? data.subject : 'Email Notification';
    }

    if (data.html) {
      payload['html'] = data.html;
    }

    if (data.cc) {
      payload['cc'] = data.cc;
    }

    if (data.template) {
      payload['template'] = './' + data.template;
      payload['context'] = data.template.context;
    }

    if (data.text) {
      payload['text'] = data.text;
    }

    return payload;
  }

  // async sendMailConfirmation(emails: any, data: any = null) {
  //   await this.mailerService.sendMail({
  //     to: emails,
  //     subject: data.title,
  //     template: './' + data.template,
  //     context: data.data
  //   });
  // }
}
