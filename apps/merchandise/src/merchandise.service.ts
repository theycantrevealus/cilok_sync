import { MerchantService } from '@deduct/services/merchant.service';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { ObjectId } from 'bson';
import { ClientSession, Connection, Model } from 'mongoose';

import { NotificationContentService } from '@/application/services/notification-content.service';
import { StockDTO } from '@/stock/dto/stock.dto';
import { Stock, StockDocument } from '@/stock/models/stock.model';
import { StockThresholdCounter } from '@/stock/models/stock-threshold-counter.model';
import { StockService } from '@/stock/services/stock.service';

import {
  REDEEM_MERCHANDISE_FAILED_GENERAL,
  REDEEM_MERCHANDISE_FAILED_NOSTOCK,
  REDEEM_MERCHANDISE_SUCCESS,
} from './constants/merchandise.kafka.dto';

@Injectable()
export class MerchandiseService {
  private connection: Connection;
  private startDate: Date;

  constructor(
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly refundClient: ClientKafka,

    @InjectConnection()
    connection: Connection,

    @InjectModel(Stock.name)
    private stockModel: Model<StockDocument>,

    @InjectModel(StockThresholdCounter.name)
    private stockThresholdCounterModel: Model<StockThresholdCounter>,

    private readonly configService: ConfigService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    private stockService: StockService,
    private merchantService: MerchantService,
    private notifService: NotificationContentService,
  ) {
    this.connection = connection;
    this.startDate = new Date();
  }

  async processRedeemMerchandiseV2(payload: any): Promise<any> {
      try {
        // Get data stock
        await this.handleRedeemSuccess(payload);

      } catch (error) {
        // Failed
        await this.handleRedeemFailed(
          payload,
          REDEEM_MERCHANDISE_FAILED_GENERAL,
          error?.message,
        );
      }
  }

  // CORE PROCESS
  async processRedeemMerchandise(payload: any): Promise<any> {
    let counter: any;

    // Get data stock
    const stock = await this.getStockData(
      payload,
      payload.customer.location_id,
    );
    
    console.log("X_RESULT_STOCK_MERCHANDISE --> ", stock)

    // If stock not exist or balance is == 0 redeem failed
    if (!stock || !stock.balance) {
      await this.handleRedeemFailed(
        payload,
        REDEEM_MERCHANDISE_FAILED_NOSTOCK,
        `[STOCK DATA NOT FOUND OR OUT OF BALANCE] product: ${payload.payload.direct_redeem.merchandise}, location: ${payload.customer.location_id}, keyword: ${payload.payload.direct_redeem.keyword}`,
      );
      return;
    }

    // If threshold counter exist then find the counter
    if (payload.payload.direct_redeem.stock_type != 'no_threshold') {
      counter = await this.findOrCreateCounter(payload, stock);
    }

    // Deduct stock
    await this.deductStock(payload, stock, counter);
  }

  // Find stock data based on product & location
  private async getStockData(payload: any, location_id: string): Promise<any> {
  
    let data : StockDTO = {
      location : location_id,
      keyword : payload.payload.direct_redeem.keyword,
      product : payload.payload.direct_redeem.merchandise
    }
  

  return this.stockService.getStock(data);
  
  // TODO :: take out, new mechanism - 2024-02-23
  // return this.stockModel
  //   .findOne({
  //     product: this.toObjectId(payload.payload.direct_redeem.merchandise),
  //     keyword: this.toObjectId(payload.payload.direct_redeem.keyword),
  //     location: this.toObjectId(location_id),
  //   })
  //   .lean();

  }

  private async findOrCreateCounter(payload: any, stock: any): Promise<any> {
    let sc: any;
    const today = new Date(Date.now());

    sc = await this.findStockCounterByStockId(stock._id, today);

    if (!sc) {
      await this.createCounter(payload, stock, today);

      sc = await this.findStockCounterByStockId(stock, today);
    }

    return sc;
  }

  private async findStockCounterByStockId(
    stock_id: string,
    today: Date,
  ): Promise<any> {
    if (ObjectId.isValid(stock_id)) {
      return this.stockThresholdCounterModel.findOne({
        stock_id: this.toObjectId(stock_id),
        start_date: { $lte: today },
        end_date: { $gte: today },
      });
    } else {
      console.error(`Found invalid stock id BSON data: ${stock_id}`);
      return null;
    }
  }

  private async createCounter(
    payload: any,
    stock: any,
    today: Date,
  ): Promise<any> {
    const stock_type = payload.payload.direct_redeem.stock_type;
    // Handle shift counter
    if (payload.payload.direct_redeem.keyword_schedule == 'Shift') {
      return this.createCounterShift(payload, stock, today);
    } else if (
      stock_type == 'daily_threshold' ||
      stock_type == 'daily_carry_over'
    ) {
      return this.createCounterDaily(payload, stock, today);
    } else {
      return this.handleRedeemFailed(
        payload,
        REDEEM_MERCHANDISE_FAILED_GENERAL,
        'Failed to create threshold counter',
      );
    }
  }

  private async createCounterDaily(
    payload: any,
    stock: any,
    today: Date,
  ): Promise<any> {
    const stock_type = payload.payload.direct_redeem.stock_type;
    const start_date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );
    const end_date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      0,
      0,
      0,
    );
    let threshold_amount = payload.payload.direct_redeem.threshold;
    let diff_days = 0;

    if (stock_type == 'daily_carry_over') {
      // Find latest stock counter
      const latest_sc = await this.stockThresholdCounterModel
        .findOne(
          {
            stock_id: stock._id,
          },
          null,
          {
            sort: { created_at: -1 },
          },
        )
        .lean();

      // Handling jika record terakhir adalah H-(>1)
      if (latest_sc) {
        const diff_time = Math.abs(
          today.getTime() - latest_sc.start_date.getTime(),
        );
        diff_days = Math.floor(diff_time / (1000 * 3600 * 24));
        threshold_amount =
          latest_sc.threshold_amount -
          latest_sc.threshold_counter +
          diff_days * latest_sc.threshold_amount;
      }
    }

    const counter = {
      stock_id: stock._id,
      start_date: start_date,
      end_date: end_date,
      threshold_counter: 0,
      threshold_amount,
    };
    await this.merchandiseLogger(
      payload,
      'Save Counter Success',
      'verbose',
      this.startDate,
      HttpStatus.OK,
    );
    return this.saveCounterToDB(counter);
  }

  private async createCounterShift(
    payload: any,
    stock: any,
    today: Date,
  ): Promise<any> {
    const transactionSession = await this.connection.startSession();
    transactionSession.startTransaction();

    try {
      for await (const shift of payload.payload.direct_redeem.keyword_shift) {
        const threshold_amount = payload.payload.direct_redeem.threshold;
        const start_date = new Date(Date.parse(shift.from));
        const end_date = new Date(Date.parse(shift.to));

        if (start_date < today) {
          throw new Error('Shift invalid');
        }

        const counter = {
          stock_id: stock._id,
          start_date: start_date,
          end_date: end_date,
          threshold_counter: 0,
          threshold_amount,
        };

        const x = await this.saveCounterToDB(counter, transactionSession);
        return x;
      }

      await transactionSession.commitTransaction();
    } catch (e) {
      await this.handleRedeemFailed(
        payload,
        REDEEM_MERCHANDISE_FAILED_GENERAL,
        e.toString(),
      );
      await transactionSession.abortTransaction();
    } finally {
      await transactionSession.endSession();
    }
  }

  private async saveCounterToDB(
    stockData: any,
    session?: ClientSession,
  ): Promise<any> {
    const stock = new this.stockThresholdCounterModel(stockData);

    return await stock.save({ session });
  }

  private async deductStock(
    payload: any,
    stock: any,
    counter: any,
  ): Promise<any> {
    const transactionSession = await this.connection.startSession();
    transactionSession.startTransaction();

    try {
      const stockdto: StockDTO = {
        keyword: payload.payload.direct_redeem.keyword,
        location: stock.location,
        product: stock.product,
        qty: 1,
        transaction_id : payload?.tracing_id || null
      };

      console.log("X_PREPARE_STOCK_DTO_MERCHANDISE --> ", stockdto)

      // TODO :: Take out, use general threshold general - 2024-02-23
      // if (counter) {
      //   if (counter.threshold_counter >= counter.threshold_amount) {
      //     throw new Error('Threshold reached');
      //   }

      //   await this.decreaseCounter(counter, transactionSession);
      // }

      await this.stockService.deduct(
        stockdto,
        payload.account,
        transactionSession,
      );

      await this.handleRedeemSuccess(payload);

      await transactionSession.commitTransaction();
    } catch (e) {

      console.log("X_FAILED_MERCHANDISE --> ", e )

      await this.handleRedeemFailed(
        payload,
        REDEEM_MERCHANDISE_FAILED_GENERAL,
        e.toString(),
      );
      await transactionSession.abortTransaction();
    } finally {
      await transactionSession.endSession();
    }
  }

  private async decreaseCounter(
    counter: any,
    session: ClientSession,
  ): Promise<any> {
    return this.stockThresholdCounterModel.updateOne(
      {
        _id: counter._id,
      },
      {
        $inc: {
          threshold_counter: 1,
        },
      },
      {
        session,
      },
    );
  }

  private async handleRedeemFailed(
    payload: any,
    notif_lov: string,
    errmsg: string,
  ): Promise<any> {
    payload.origin = `${payload.origin}.merchandise_failed`;
    const failed_notification = await this.notifService.getNotificationTemplate(
      notif_lov,
      payload,
    );
    payload.notification = failed_notification;
    payload.error_message = errmsg;

    // Send failed notification
    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);

    // Refund poin
    await this.handleRefundPoint(
      payload,
      failed_notification[0]
        ? failed_notification[0].template_content
        : `MERCHANDISE_ERROR`,
    );
    await this.merchandiseLogger(
      payload,
      errmsg,
      'verbose',
      this.startDate,
      HttpStatus.BAD_REQUEST,
    );
  }

  async handleRedeemSuccess(payload: any) {
    payload.origin = `${payload.origin}.merchandise_success`;

    payload.notification = await this.notifService.getNotificationTemplate(
      REDEEM_MERCHANDISE_SUCCESS,
      payload,
    );
    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
    await this.merchandiseLogger(
      payload,
      'Merchandise Redeem Success',
      'verbose',
      this.startDate,
      HttpStatus.OK,
    );
  }

  private async handleRefundPoint(payload: any, refund_reason: string) {
    const refund = await this.merchantService
      .getMerchantSelf(payload.token)
      .then((res) => {
        const pin = res.payload.merchant_config.authorize_code.refund;
        return {
          locale: payload.payload.deduct.locale,
          transaction_no: payload.payload.deduct.transaction_no,
          type: payload.payload.deduct.type,
          // Reason TBC
          reason: refund_reason,
          remark: `Refund ${payload.keyword.eligibility.program_title_expose}`,
          authorize_pin: pin,
          member_id: payload.payload.deduct.member_id,
          realm_id: payload.payload.deduct.realm_id,
          branch_id: payload.payload.deduct.branch_id,
          merchant_id: payload.payload.deduct.merchant_id,
          __v: 0,
        };
      });

    payload.payload.refund = refund;
    payload.incoming.ref_transaction_id = payload.payload.deduct.transaction_no;

    this.refundClient.emit('refund', payload);
    await this.merchandiseLogger(
      payload,
      'Refund Point Success',
      'verbose',
      this.startDate,
      HttpStatus.OK,
    );
  }

  async merchandiseLogger(
    payload,
    message,
    level: string,
    start: Date,
    statusCode,
  ) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: level,
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.batch_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      statusCode: statusCode,
      payload: {
        service: 'merchandise',
        user_id: payload?.account,
        method: 'kafka',
        url: 'merchandise',
        step: `merchandise ${message}`,
        param: payload,
        result: payload,
      } satisfies LoggingData,
    });
  }

  toObjectId(value?: string): ObjectId | string | null {
    if (!value) return null;
  
    try {
      return this.toObjectId(value);
    } catch (err) {
      return value;
    }
  }
  
}


