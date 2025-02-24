import * as process from 'process';

export default () => ({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    clients: {
      program: process.env.REDIS_PROGRAM,
      merchant: process.env.REDIS_MERCHANT,
      keyword: process.env.REDIS_KEYWORD,
      inject: process.env.REDIS_INJECT,
      logging: process.env.REDIS_LOGGING,
      customer: process.env.REDIS_CUSTOMER,
      sftp: process.env.REDIS_SFTP,
      location: process.env.REDIS_LOCATION,
      migration: process.env.REDIS_MIGRATION,
    },
  },
});
