import * as winston from 'winston';

import { TimeManagement } from '@/application/utils/Time/timezone';

import { ILog } from './handler';
const today = new TimeManagement();

const sPad = {
  level: '                                  ',
  timestamp: '                          ',
  content: '',
};

// TODO : Move to /data
export function parseToLog(timestamp, level, parameter: LoggingData) {
  /*
   * | timestamp | level | statusCode | method | endpoint |
   * | transaction | msisdn | step | message | keyword | program |
   * | user | takentime | service | origin | status_trx |
   * */
  const status_trx =
    parameter?.payload?.status_trx ?? parameter?.param?.status_trx ?? '';
  const origin = parameter?.payload?.origin ?? parameter?.param?.origin ?? '';
  const method = parameter?.payload?.method ?? parameter?.method ?? '';
  const url =
    parameter?.payload?.url ??
    parameter.url ??
    parameter?.param?.endpoint ??
    '';
  const msisdn =
    parameter?.payload?.result?.msisdn ??
    parameter?.payload?.param?.msisdn ??
    parameter?.param?.incoming?.msisdn ??
    '';
  const step = parameter?.payload?.step ?? parameter?.step ?? '';
  const keyword =
    parameter?.payload?.parameter?.keyword?.eligibility?.name ??
    parameter?.param?.keyword?.eligibility?.name ??
    parameter?.payload?.param?.keyword ??
    '';
  const program =
    parameter?.payload?.parameter?.program?.name ??
    parameter?.param?.program?.name ??
    '';
  const account =
    parameter?.payload?.parameter?.account?.email ??
    parameter?.payload?.user_id?.email ??
    parameter?.param?.account?.email ??
    '';

  let message = 'undefined';
  try {
    message =
      (parameter?.payload?.result?.message ??
        parameter?.result?.message ??
        '') +
      (parameter?.result?.result
        ? ` ---->> ${
            JSON.stringify(parameter?.result?.result?.message) ?? ''
          } [${JSON.stringify(parameter?.result?.result?.stack) ?? ''}]`
        : '');
  } catch (error) {
    message = error;
  }

  const service = parameter?.payload?.service ?? parameter?.service;

  return `${timestamp}|${level}|${
    parameter?.statusCode ?? ''
  }|${method}|${url}|${
    parameter?.transaction_id ?? ''
  }|${msisdn}|${step}|${message}|${keyword}|${program}|${account}|${
    parameter?.taken_time ?? ''
  }|${service ?? ''}|${origin}|${status_trx}`;
}

const lPad = {
  level: '──────────────────────────',
  timestamp: '────────────────────────────',
  content: '',
};

const lastLine = `\n└${pad(lPad.level, '', false)}┴${pad(
  lPad.timestamp,
  '',
  false,
)}┴${pad(lPad.content, '', false)}──┘`;

function clearLastLine() {
  process?.stdout?.moveCursor(0, -1);
  process?.stdout?.clearLine(1);
}

export function pad(pad, str, padLeft) {
  if (typeof str === 'undefined') return pad;
  if (padLeft) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}

export const WinstonCustomTransport = {
  development: {
    batch: [
      new winston.transports.File({
        filename: `logs/apps_batch.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    cli: [
      new winston.transports.Console({
        level: 'debug',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
      new winston.transports.File({
        filename: `logs/apps_gateway.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    gateway: [
      new winston.transports.File({
        filename: `logs/apps_gateway.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem: [
      new winston.transports.File({
        filename: `logs/apps_redeem.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_low: [
      new winston.transports.File({
        filename: `logs/apps_redeem_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_high: [
      new winston.transports.File({
        filename: `logs/apps_redeem_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility: [
      new winston.transports.File({
        filename: `logs/apps_eligibility.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility_low: [
      new winston.transports.File({
        filename: `logs/apps_eligibility_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility_high: [
      new winston.transports.File({
        filename: `logs/apps_eligibility_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    outbound: [
      new winston.transports.File({
        filename: `logs/apps_outbound.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting: [
      new winston.transports.File({
        filename: `logs/apps_reporting.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    voucher: [
      new winston.transports.File({
        filename: `logs/apps_voucher.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    donation: [
      new winston.transports.File({
        filename: `logs/apps_donation.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    void: [
      new winston.transports.File({
        filename: `logs/apps_void.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct: [
      new winston.transports.File({
        filename: `logs/apps_deduct.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct_low: [
      new winston.transports.File({
        filename: `logs/apps_deduct_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct_high: [
      new winston.transports.File({
        filename: `logs/apps_deduct_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon: [
      new winston.transports.File({
        filename: `logs/apps_coupon.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon_low: [
      new winston.transports.File({
        filename: `logs/apps_coupon_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon_high: [
      new winston.transports.File({
        filename: `logs/apps_coupon_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    notification: [
      new winston.transports.File({
        filename: `logs/apps_notification.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    notification_general: [
      new winston.transports.File({
        filename: `logs/apps_notification_general.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_statistic: [
      new winston.transports.File({
        filename: `logs/apps_reporting_statistic.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_generation: [
      new winston.transports.File({
        filename: `logs/apps_reporting_generation.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    callback: [
      new winston.transports.File({
        filename: `logs/apps_callback.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    transaction_master: [
      new winston.transports.File({
        filename: `logs/apps_transaction_master.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    data_sync: [
      new winston.transports.File({
        filename: `logs/apps_data_sync.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    refund: [
      new winston.transports.File({
        filename: `logs/apps_refund.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    inject_point: [
      new winston.transports.File({
        filename: `logs/apps_inject_point.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    inject_point_high: [
      new winston.transports.File({
        filename: `logs/apps_inject_point_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    sftp: [
      new winston.transports.File({
        filename: `logs/apps_sftp.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    cron: [
      new winston.transports.File({
        filename: `logs/apps_cron.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    prepaid_granular: [
      new winston.transports.File({
        filename: `logs/apps_prepaid-granular.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    prepaid_granular_renewal: [
      new winston.transports.File({
        filename: `logs/apps_prepaid-granular-renewal.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    postpaid_granular: [
      new winston.transports.File({
        filename: `logs/apps_postpaid-granular.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    merchandise: [
      new winston.transports.File({
        filename: `logs/apps_merchandise.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_point_event: [
      new winston.transports.File({
        filename: `logs/apps_reporting_point_event.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_redeem: [
      new winston.transports.File({
        filename: `logs/apps_manual_redeem.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_redeem_google: [
      new winston.transports.File({
        filename: `logs/apps_manual_redeem_google.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    vote: [
      new winston.transports.File({
        filename: `logs/apps_vote.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    auction: [
      new winston.transports.File({
        filename: `logs/apps_auction.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    multi_bonus: [
      new winston.transports.File({
        filename: `logs/apps_multi_bonus.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_fmc: [
      new winston.transports.File({
        filename: `logs/apps_redeem_fmc.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
  },
  prod: {
    batch: [
      new winston.transports.File({
        filename: `logs/apps_notification.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    prepaid_granular: [
      new winston.transports.File({
        filename: `logs/apps_prepaid-granular.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    prepaid_granular_renewal: [
      new winston.transports.File({
        filename: `logs/apps_prepaid-granular-renewal.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    postpaid_granular: [
      new winston.transports.File({
        filename: `logs/apps_postpaid-granular.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    gateway: [
      new winston.transports.File({
        filename: `logs/apps_gateway.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem: [
      new winston.transports.File({
        filename: `logs/apps_redeem.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_low: [
      new winston.transports.File({
        filename: `logs/apps_redeem_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_high: [
      new winston.transports.File({
        filename: `logs/apps_redeem_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility: [
      new winston.transports.File({
        filename: `logs/apps_eligibility.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility_low: [
      new winston.transports.File({
        filename: `logs/apps_eligibility_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility_high: [
      new winston.transports.File({
        filename: `logs/apps_eligibility_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    outbound: [
      new winston.transports.File({
        filename: `logs/apps_outbound.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct: [
      new winston.transports.File({
        filename: `logs/apps_deduct.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct_low: [
      new winston.transports.File({
        filename: `logs/apps_deduct_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct_high: [
      new winston.transports.File({
        filename: `logs/apps_deduct_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon: [
      new winston.transports.File({
        filename: `logs/apps_coupon.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon_low: [
      new winston.transports.File({
        filename: `logs/apps_coupon_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon_high: [
      new winston.transports.File({
        filename: `logs/apps_coupon_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    notification: [
      new winston.transports.File({
        filename: `logs/apps_notification.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    notification_general: [
      new winston.transports.File({
        filename: `logs/apps_notification_general.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    voucher: [
      new winston.transports.File({
        filename: `logs/apps_voucher.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    void: [
      new winston.transports.File({
        filename: `logs/apps_void.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    callback: [
      new winston.transports.File({
        filename: `logs/apps_callback.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    transaction_master: [
      new winston.transports.File({
        filename: `logs/apps_transaction_master.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
      new winston.transports.Console({
        level: 'verbose',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf(
            (info) =>
              `${info.timestamp} - ${info.level}: ${info?.message?.step}`,
          ),
        ),
      }),
    ],
    donation: [
      new winston.transports.File({
        filename: `logs/apps_donation.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    refund: [
      new winston.transports.File({
        filename: `logs/apps_refund.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    data_sync: [
      new winston.transports.File({
        filename: `logs/apps_data_sync.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    inject_point: [
      new winston.transports.File({
        filename: `logs/apps_inject_point.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    inject_point_high: [
      new winston.transports.File({
        filename: `logs/apps_inject_point_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_statistic: [
      new winston.transports.File({
        filename: `logs/apps_reporting_statistic.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_generation: [
      new winston.transports.File({
        filename: `logs/apps_reporting_generation.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    sftp: [
      new winston.transports.File({
        filename: `logs/apps_sftp.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    cron: [
      new winston.transports.File({
        filename: `logs/apps_cron.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_process: [
      new winston.transports.File({
        filename: `logs/apps_notification.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    merchandise: [
      new winston.transports.File({
        filename: `logs/apps_merchandise.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_point_event: [
      new winston.transports.File({
        filename: `logs/apps_reporting_point_event.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_redeem: [
      new winston.transports.File({
        filename: `logs/apps_manual_redeem.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_redeem_google: [
      new winston.transports.File({
        filename: `logs/apps_manual_redeem_google.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    vote: [
      new winston.transports.File({
        filename: `logs/apps_vote.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    multi_bonus: [
      new winston.transports.File({
        filename: `logs/apps_multi_bonus.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_fmc: [
      new winston.transports.File({
        filename: `logs/apps_redeem_fmc.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
  },
  preprod: {
    batch: [
      new winston.transports.File({
        filename: `logs/apps_batch.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    prepaid_granular: [
      new winston.transports.File({
        filename: `logs/apps_prepaid-granular.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    prepaid_granular_renewal: [
      new winston.transports.File({
        filename: `logs/apps_prepaid-granular-renewal.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    postpaid_granular: [
      new winston.transports.File({
        filename: `logs/apps_postpaid-granular.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    gateway: [
      new winston.transports.File({
        filename: `logs/apps_gateway.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem: [
      new winston.transports.File({
        filename: `logs/apps_redeem.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_low: [
      new winston.transports.File({
        filename: `logs/apps_redeem_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_high: [
      new winston.transports.File({
        filename: `logs/apps_redeem_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility: [
      new winston.transports.File({
        filename: `logs/apps_eligibility.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility_low: [
      new winston.transports.File({
        filename: `logs/apps_eligibility_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    eligibility_high: [
      new winston.transports.File({
        filename: `logs/apps_eligibility_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    outbound: [
      new winston.transports.File({
        filename: `logs/apps_outbound.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct: [
      new winston.transports.File({
        filename: `logs/apps_deduct.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct_low: [
      new winston.transports.File({
        filename: `logs/apps_deduct_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    deduct_high: [
      new winston.transports.File({
        filename: `logs/apps_deduct_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon: [
      new winston.transports.File({
        filename: `logs/apps_coupon.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon_low: [
      new winston.transports.File({
        filename: `logs/apps_coupon_low.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    coupon_high: [
      new winston.transports.File({
        filename: `logs/apps_coupon_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    notification: [
      new winston.transports.File({
        filename: `logs/apps_notification.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    notification_general: [
      new winston.transports.File({
        filename: `logs/apps_notification_general.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    voucher: [
      new winston.transports.File({
        filename: `logs/apps_voucher.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    void: [
      new winston.transports.File({
        filename: `logs/apps_void.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    callback: [
      new winston.transports.File({
        filename: `logs/apps_callback.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    transaction_master: [
      new winston.transports.File({
        filename: `logs/apps_transaction_master.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    donation: [
      new winston.transports.File({
        filename: `logs/apps_donation.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    refund: [
      new winston.transports.File({
        filename: `logs/apps_refund.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    data_sync: [
      new winston.transports.File({
        filename: `logs/apps_data_sync.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    inject_point: [
      new winston.transports.File({
        filename: `logs/apps_inject_point.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    inject_point_high: [
      new winston.transports.File({
        filename: `logs/apps_inject_point_high.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_statistic: [
      new winston.transports.File({
        filename: `logs/apps_reporting_statistic.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_generation: [
      new winston.transports.File({
        filename: `logs/apps_reporting_generation.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    sftp: [
      new winston.transports.File({
        filename: `logs/apps_sftp.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    cron: [
      new winston.transports.File({
        filename: `logs/apps_cron.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_process: [
      new winston.transports.File({
        filename: `logs/apps_notification.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    merchandise: [
      new winston.transports.File({
        filename: `logs/apps_merchandise.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    reporting_point_event: [
      new winston.transports.File({
        filename: `logs/apps_reporting_point_event.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_redeem: [
      new winston.transports.File({
        filename: `logs/apps_manual_redeem.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    manual_redeem_google: [
      new winston.transports.File({
        filename: `logs/apps_manual_redeem_google.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    vote: [
      new winston.transports.File({
        filename: `logs/apps_vote.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    auction: [
      new winston.transports.File({
        filename: `logs/apps_auction.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    multi_bonus: [
      new winston.transports.File({
        filename: `logs/apps_multi_bonus.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
    redeem_fmc: [
      new winston.transports.File({
        filename: `logs/apps_redeem_fmc.log`,
        level: 'verbose',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf((data) => {
            return parseToLog(data.timestamp, data.level, data.message);
          }),
        ),
      }),
    ],
  },
};

export class LoggingData {
  service?: string; // Nama service lokasi logging Ex?: CustomerService, EligiService
  method?: string;
  user_id?: IAccount | null; // Account
  step?: string; // User defined. Check eligi by los ?: eligible
  param?: any; // parameter proses
  result?: any; // hasil dari proses
  url?: string;
  taken_time?: number;
  transaction_id?: string;
  statusCode?: number;
  notif_customer?: boolean;
  notif_operation?: boolean;
  payload?: any;
  constructor(data: any) {
    this.service = data?.service;
    // this.session_id = new IAccount(data?.session_id) ?? null;
    this.user_id = data?.user_id?.email ?? null;
    this.step = data?.step ?? '';
    this.param = data?.param ?? '';
    this.result = data?.result ?? '';
    this.method = data?.method ?? '';
    this.url = data?.url ?? '';
    this.taken_time = data?.taken_time ?? '';
    this.transaction_id = data?.transaction_id ?? '';
    this.statusCode = data?.statusCode ?? null;
    this.notif_customer = data?.notif_customr ?? false;
    this.notif_operation = data?.notif_operation ?? false;
    this.payload = data?.payload;
  }
}

export class IAccount {
  _id?: string;
  user_name: string;
  email: string;
  first_name: string;
  last_name: string;

  constructor(data: any) {
    this._id = data?._id ?? '';
    this.user_name = data?.user_name ?? '';
    this.email = data?.email ?? '';
    this.first_name = data?.first_name ?? '';
    this.last_name = data?.last_name ?? '';
  }
}

export class LoggingResult {
  step?: string;
  message?: string;
  data?: any;
  statusCode?: string | number;
  constructor(data: any) {
    this.step = data?.step ?? '';
    this.message = data?.message ?? '';
    this.data = data?.data ?? null;
    this.statusCode = data?.statusCode ?? 400;
  }
}

// case A : { pic: true, cust: true }
