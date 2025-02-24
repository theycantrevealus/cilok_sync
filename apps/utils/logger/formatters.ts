import { redeem_data } from '__tests__/mocks/redeem/payload';

export class TimestampFirst {
  private enabled = true;
  constructor(enabled = true) {
    this.enabled = enabled;
  }
  transform(obj) {
    if (this.enabled) {
      return Object.assign(
        {
          timestamp: obj.timestamp,
        },
        obj,
      );
    }
    return obj;
  }
}

export function allowedMSISDN_FMC(msisdn: string) {
  return (
    allowedMSISDN(msisdn) ||
    allowedIndihomeNumber(msisdn) ||
    allowedTselID(msisdn)
  );
}

export function allowedMSISDN(msisdn: string) {
  const testRegex = new RegExp(/^(08|62|81|82|83|85|628)+[0-9]+$/gm);
  return testRegex.test(msisdn);
}

export function allowedIndihomeNumber(msisdn: string) {
  const testRegex = new RegExp(/^(1)+[0-9]+$/gm);
  return testRegex.test(msisdn);
}

export function allowedTselID(msisdn: string) {
  return true;
}

export function formatMsisdnCore(msisdn: string) {
  let ret = msisdn;
  const testRegex = new RegExp(/^(628|8)/gm);
  ret = msisdn.replace(testRegex, '08');
  return ret;
}

export function formatIndihomeCore(msisdn: string) {
  const testRegex = new RegExp(/^(1)/gm);
  return msisdn.replace(testRegex, '01');
}

export function reformatMSISDN_FMC(msisdn: string) {
  let newFormat: string = msisdn;
  if (allowedMSISDN(msisdn)) {
    newFormat = formatMsisdnCore(msisdn);
  } else if (allowedIndihomeNumber(msisdn)) {
    newFormat = formatIndihomeCore(msisdn);
  }
  return newFormat;
}
