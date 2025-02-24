import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment';
import { Hears, On, Update } from 'nestjs-telegraf';
import { lastValueFrom, map } from 'rxjs';
import { Context } from 'telegraf';

import { Command } from '../../types/command.interface';
import { Program } from '../../types/program.interface';
import { Stock } from '../../types/stock.interface';
import { Transaction } from '../../types/transaction.interface';
import { formatNumber } from '../../utils/number.util';

@Update()
@Injectable()
export class TelegramBotService {
  constructor(private httpService: HttpService, private logger: Logger) {}

  async getBotInformation(): Promise<object> {
    return {
      name: 'TPoin Bot',
      url: 'https://t.me/tpoin_bot',
    };
  }

  @Hears('help')
  async help(ctx: Context) {
    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/help`,
        })
        .pipe(map((res) => res.data));

      const value = await lastValueFrom(observable);
      const commandList: Command[] = value.payload.map((item) => ({
        description: item?.desc,
        format: `${item?.command} <space> ${item?.param?.map((p) => `<${p}>`)}`,
      }));

      const message = `
Below is the list of requests i can provide:

${commandList
  .map((item, index) => `${index + 1}. ${item.description}\n${item.format}`)
  .join('\n')}
    `;
      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  @Hears(/^search\s/)
  async search(ctx: Context) {
    await this.sendWaitingMessage(ctx);

    const text = (ctx.message as any).text;
    const param = text.replace(/^search\s/, '');

    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/keyword/${param}/transaction`,
        })
        .pipe(map((res) => res.data));

      const ret = await lastValueFrom(observable);
      const value: Transaction = ret?.payload;

      const message = `Status as of ${moment(value.date)
        .format('DD MMM YYYY')
        .toUpperCase()} jam ${moment(value.date).format(
        'HH:mm',
      )} \nFor keyword "${param}"

YTD
-----
Unique Redeemer = ${value?.ytd?.unique_redeemer ?? 'N/A'}
Trx = ${value?.ytd?.trx ?? 'N/A'}
Poin Burned = ${value?.ytd?.point_burned ?? 'N/A'}

MTD
-----
Unique Redeemer = ${value?.mtd?.unique_redeemer ?? 'N/A'}
Trx = ${value?.mtd?.trx ?? 'N/A'}
Poin Burned = ${value?.mtd?.point_burned ?? 'N/A'}

TODAY
-----
Unique Redeemer = ${value?.today?.unique_redeemer ?? 'N/A'}
Trx = ${value?.today?.trx ?? 'N/A'}
Poin Burned = ${value?.today?.point_burned ?? 'N/A'}
      `;
      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  @Hears(/^lkey\s/)
  async lkey(ctx: Context) {
    await this.sendWaitingMessage(ctx);

    const text = (ctx.message as any).text;
    const param = text.replace(/^lkey\s/, '');

    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/program/${param}/keyword`,
        })
        .pipe(map((res) => res.data));

      const ret = await lastValueFrom(observable);
      const value = ret?.payload;
      const keyList = value.keywords;

      const message = `
Below is the list of keywords in program "${param}"

${keyList.join('\n')}
      `;

      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  @Hears(/^program\s/)
  async program(ctx: Context) {
    await this.sendWaitingMessage(ctx);

    const text = (ctx.message as any).text;
    const param = text.replace(/^program\s/, '');

    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/program/${param}/transaction`,
        })
        .pipe(map((res) => res.data));

      const ret = await lastValueFrom(observable);
      const value: Transaction = ret?.payload;

      const message = `Status as of ${moment(value.date)
        .format('DD MMM YYYY')
        .toUpperCase()} jam ${moment(value.date).format(
        'HH:mm',
      )} \nFor keyword "${param}"

YTD
-----
Unique Redeemer = ${value?.ytd?.unique_redeemer ?? 'N/A'}
Trx = ${value?.ytd?.trx ?? 'N/A'}
Poin Burned = ${value?.ytd?.point_burned ?? 'N/A'}

MTD
-----
Unique Redeemer = ${value?.mtd?.unique_redeemer ?? 'N/A'}
Trx = ${value?.mtd?.trx ?? 'N/A'}
Poin Burned = ${value?.mtd?.point_burned ?? 'N/A'}

TODAY
-----
Unique Redeemer = ${value?.today?.unique_redeemer ?? 'N/A'}
Trx = ${value?.today?.trx ?? 'N/A'}
Poin Burned = ${value?.today?.point_burned ?? 'N/A'}
            `;

      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  @Hears(/^key\s/)
  async key(ctx: Context) {
    await this.sendWaitingMessage(ctx);

    const text = (ctx.message as any).text;
    const param = text.replace(/^key\s/, '');

    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/keyword/${param}/name-only`,
        })
        .pipe(map((res) => res.data));

      const ret = await lastValueFrom(observable);
      const value = ret?.payload;
      const keyList: string[] = value;

      const message = `
Below is the list of keywords like "${param}"

${keyList.join('\n')}
      `;

      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  @Hears(/^prog\s/)
  async prog(ctx: Context) {
    await this.sendWaitingMessage(ctx);

    const text = (ctx.message as any).text;
    const param = text.replace(/^prog\s/, '');

    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/program/${param}/active`,
        })
        .pipe(map((res) => res.data));

      const ret = await lastValueFrom(observable);
      const value = ret?.payload;
      const programs: Program[] = value;

      const message = `
Below is the list of programs like "${param}"
Program Name | Program ID

${programs.map((item) => `${item.name} | ${item.id}`).join('\n')}
            `;

      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  @Hears(/^stock\s/)
  async stock(ctx: Context) {
    await this.sendWaitingMessage(ctx);

    const text = (ctx.message as any).text;
    const param = text.replace(/^stock\s/, '');

    try {
      const observable = await this.httpService
        .request({
          method: 'GET',
          url: `/v1/telegram/keyword/${param}/stock`,
        })
        .pipe(map((res) => res.data));

      const ret = await lastValueFrom(observable);
      const value = ret?.payload;
      const stock: Stock = {
        program_name: value?.program_name,
        keyword: value?.keyword,
        sisa_stock: value?.stockLeft,
        sisa_voucher: value?.voucherLeft,
      };

      const message = `
Status Stock untuk keyword "${param}"
Program Name | Keyword | Sisa Stock | Sisa Voucher

${stock.program_name} | ${stock.keyword} | ${formatNumber(
        stock.sisa_stock,
      )} | ${formatNumber(stock.sisa_voucher)}
            `;

      await ctx.reply(message);
    } catch (err) {
      this.logger.error(err);
      await this.sendErrorMessage(ctx);
    }
  }

  // - - - - - - -

  @On('message')
  async on(ctx: Context) {
    const text = (ctx.message as any).text;
    this.logger.warn(`Invalid command: ${text}`);

    await ctx.reply('⚠️ Invalid command!');
  }

  async sendErrorMessage(ctx: Context) {
    const message = '⚠️ Sorry, an error occured! Please try again later...';

    await ctx.reply(message);
  }

  async sendWaitingMessage(ctx: Context) {
    const message = `
Hi, I'm preparing your request.
Thanks for waiting.
    `;

    await ctx.reply(message);
  }
}
