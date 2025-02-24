import { BullModuleAsyncOptions, BullModuleOptions } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
dotenv.config({
  path:
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === '' ||
    process.env.NODE_ENV === 'development'
      ? `env/.env`
      : `env/${process.env.NODE_ENV}.env`,
});

export const RedisLogging = {
  name: process.env.REDIS_LOGGING,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisProgram = {
  name: process.env.REDIS_PROGRAM,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisInject = {
  name: process.env.REDIS_INJECT,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisSftp = {
  name: process.env.REDIS_SFTP,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisKeyword = {
  name: process.env.REDIS_KEYWORD,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisMerchant = {
  name: process.env.REDIS_MERCHANT,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisLocation = {
  name: process.env.REDIS_LOCATION,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisDataMaster = {
  name: process.env.REDIS_DATA_MASTER,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisCustomer = {
  name: process.env.REDIS_CUSTOMER,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisMigration = {
  name: process.env.REDIS_MIGRATION,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisTrxRecovery = {
  name: process.env.REDIS_TRANSACTION_RECOVERY,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisLuckyDraw = {
  name: process.env.REDIS_LUCKY_DRAW,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisCampaign = {
  name: process.env.REDIS_CAMPAIGN,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};

export const RedisMultibonus = {
  name: process.env.REDIS_MULTI_BONUS,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<BullModuleOptions> => {
    if (configService.get<string>('redis.password') !== '') {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      };
    } else {
      return {
        redis: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      };
    }
  },
};
