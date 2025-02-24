import { CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { Type } from 'class-transformer';
import mongoose, { Model } from 'mongoose';
import { Types } from 'telegraf';

import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { getProductID } from '@/application/utils/Product/product';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  StockSummary,
  StockSummaryDocument,
} from '@/stock/models/stocks-summary.model';
import { StockService } from '@/stock/services/stock.service';

@Injectable()
export class TransKeywordService {
  constructor(
    @Inject(KeywordService)
    private readonly keywordService: KeywordService,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,

    private stockService: StockService,
  ) {}

  async keyword_status(
    param: any,
    query: any,
  ): Promise<GlobalTransactionResponse> {
    const keyword = await this.keywordModel
      .findOne({
        'eligibility.name': param.keyword,
      })
      .exec();
    const response = new GlobalTransactionResponse();

    enum KeywordStatus {
      NO_STOCK = 1,
      OK = 2,
      NOT_ACTIVE = 3,
    }

    if (keyword !== null) {
      const systemConfig = await this.systemConfigModel
        .findOne({ param_value: keyword.keyword_approval.toString() })
        .exec();
      const approvalStatus = systemConfig.param_key;

      let status: KeywordStatus = null;

      if (
        [
          'DEFAULT_STATUS_KEYWORD_APPROVE_NON_HQ',
          'DEFAULT_STATUS_KEYWORD_APPROVE_HQ',
        ]?.includes(approvalStatus)
      ) {
        // jika keyword approved

        const nowDate = new Date();
        const startPeriod = new Date(keyword.eligibility.start_period);
        const endPeriod = new Date(keyword.eligibility.end_period);
        if (nowDate <= endPeriod && nowDate >= startPeriod) {
          // jika keyword masih dalam masa periode

          const totalStock = await this.stockService.getTotalStockByKeyword({
            keyword: keyword._id,
          });

          if (totalStock === 0) {
            // jika stock kosong
            console.log(`[${param.keyword}] stock kosong`);
            status = KeywordStatus.NO_STOCK;
          } else {
            status = KeywordStatus.OK;
          }
        } else {
          // jika keyword tidak dalam masa periode
          console.log(`[${param.keyword}] keyword tidak dalam masa periode`);
          status = KeywordStatus.NOT_ACTIVE;
        }
      } else {
        // jika keyword belum approve
        console.log(`[${param.keyword}] keyword belum diapprove`);
        status = KeywordStatus.NOT_ACTIVE;
      }

      response.code = HttpCodeTransaction.CODE_SUCCESS_200;
      response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
      response.payload = {
        transaction_id: query?.transaction_id,
        keyword_status: status,
      };
    }

    if (keyword === null) {
      // throw new BadRequestException([{ isInvalidDataContent: "Keyword Not Found" }]);
      response.code = HttpCodeTransaction.CODE_SUCCESS_200;
      response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
      response.payload = {
        transaction_id: query?.transaction_id,
        keyword_status: KeywordStatus.NOT_ACTIVE,
      };
    }

    return response;
  }

  async keyword_stock(param: any): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    const filter = JSON.parse(param?.filter ?? {});
    const res = [];
    const toDay = new Date();

    const splitKeyword = filter?.keyword?.split('|');

    for (let i = 0; i < splitKeyword?.length; i++) {
      const keyword = await this.keywordService.getkeywordProfile(
        splitKeyword[i],
        true,
      );

      if (!keyword) {
        response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
        response.message = HttpMsgTransaction.DESC_ERR_NOT_FOUND_404;
        return response;
      }

      let totalStock = 0;
      const flashsale = keyword?.eligibility?.flashsale || null;
      console.log('== FLASH SALE==', flashsale);

      const isFlashsaleActive =
        flashsale !== null &&
        flashsale?.status &&
        new Date(flashsale?.start_date) <= toDay &&
        new Date(flashsale?.end_date) >= toDay;

      if (isFlashsaleActive || filter?.stock_type == 'flashsale') {
        console.log('== FS TRUE ==');
        totalStock = await this.stockService.getTotalStockFlashSaleByKeyword({
          keyword: keyword?._id,
        });
      } else {
        console.log('=== FS FALSE ===');
        totalStock = await this.stockService.getStockSummaryFromRedis(
          keyword?._id,
        );
      }

      res.push({ keyword: keyword?.eligibility?.name, stock: totalStock ?? 0 });
    }

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.payload = {
      stocks: res,
    };

    return response;
  }

  async keyword_stock_redis(
    param: any,
    query: any,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    // Mengambil `keyword` dari `param`
    const keyword = param.keyword;

    // Parsing query filter atau memberikan objek kosong sebagai default
    const filter = query?.filter ? JSON.parse(query.filter) : {};

    // Inisialisasi array hasil dan variabel untuk total stock
    const list_of_stock: any[] = [];
    let total_stock = 0;
    let total_flashsale_stock = 0;

    // Mendapatkan profile keyword
    const getKeyword = await this.keywordService.getkeywordProfile(
      keyword,
      true,
    );

    // Cek jika `getKeyword` dan `bonus` ada, serta `stock_location` valid
    if (getKeyword?.bonus?.length > 0) {
      const stock_location = getKeyword.bonus[0].stock_location;

      for (let i = 0; i < stock_location?.length; i++) {
        const locationId = stock_location[i]?.location_id;

        // Jika tidak ada locationId, lanjut ke iterasi berikutnya
        if (!locationId) continue;

        const key = `${RedisDataKey.STOCK_KEY}-${getKeyword._id}-${locationId}`;

        console.log('KEY REDIS', key);
        // Ambil data dari Redis cache
        const redisStock: any = await this.cacheManager.get(key);
        let result_db: any;

        let stock = 0;
        let flashsale_stock = 0;

        if (redisStock) {
          console.log('GET IN REDIS', redisStock);
          // Split the Redis value to get balance and flashsale_balance
          const [balance, flashsale_balance] = redisStock
            .split('|')
            .map(Number);
          stock = balance || 0;
          flashsale_stock = flashsale_balance || 0;
        } else {
          // Jika tidak ada di Redis, ambil dari database
          result_db = await this.stockService.getStockDetail({
            location: locationId,
            product: '',
            keyword: getKeyword._id,
          });
          console.log('GET IN DB', result_db);
          stock = result_db?.balance ?? 999999999999;
          flashsale_stock = result_db?.balance_flashsale ?? 999999999999;


          // Store the fetched data in Redis in the "balance|flashsale_balance" format
          // const redisValue = `${stock}|${flashsale_stock}`;
          // await this.cacheManager.set(key, redisValue);
        }

        // Jumlahkan total stok dan stok flashsale
        total_stock += stock;
        total_flashsale_stock += flashsale_stock;

        // Tambahkan ke list_of_stock
        list_of_stock.push({
          location: stock_location[i].name || 'Unknown', // Nama lokasi, ganti sesuai struktur
          stock: stock,
          flashsale_stock: flashsale_stock,
        });
      }
    }

    // Siapkan response dengan total dan daftar stok
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.payload = {
      total_stock: total_stock,
      total_flashsale_stock: total_flashsale_stock,
      list_of_stock: list_of_stock,
    };

    return response;
  }
}
