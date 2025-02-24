import { Injectable } from '@nestjs/common';
import ShortUniqueId from 'short-unique-id';

@Injectable()
export class TransactionOptionalService {
  constructor() {}

  getTracingId(request: any, response: any) {
    // const SLO_id = request.transaction_id ? request.transaction_id: new Types.ObjectId();
    
    const curr_date = new Date();
    const randomNumber = this.generateRandomThreeDigitNumber().toString();
    const msisdn = this.customSplice(request?.msisdn) ?? this.generateRandomThreeDigitNumber();
    const years = this.customSplice(curr_date.getFullYear(), -2) ?? this.customSplice(this.generateRandomThreeDigitNumber(),-2);
    const month = this.getCurrentDateFormatted('month');
    const day = this.getCurrentDateFormatted('day');
    const hours = this.getCurrentDateFormatted('hours');
    const minutes = this.getCurrentDateFormatted('minutes');
    const seconds = this.getCurrentDateFormatted('seconds');
    const milliseconds = this.getCurrentDateFormatted('milliseconds');

    const SLO_tracing_id = `SLO_${msisdn}${years}${month}${day}${hours}${minutes}${seconds}${milliseconds}${randomNumber.toString()}`;
    const trace_id =
      response.trace_custom_code === 'UND' || !response.trace_custom_code
        ? SLO_tracing_id
        : `${response.trace_custom_code}_${msisdn}${years}${month}${day}${hours}${minutes}${seconds}${milliseconds}${randomNumber.toString()}`;

    return trace_id;
  }

  generateRandomThreeDigitNumber() {
    return Math.floor(Math.random() * (999 - 100 + 1)) + 100;
  }

  customSplice(data:any=null,slice=-3){
    if(data){
      let rsl = data.toString().slice(slice);
      return rsl;
    }

    return null
  }

  getCurrentDateFormatted(format = null, zona = "GMT+7") {
    const date = new Date();
    let zona_ = null;
    if(zona == "GMT+7"){
      zona_ = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    }
  
    const year = zona_.getUTCFullYear();
    const month = (zona_.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = zona_.getUTCDate().toString().padStart(2, '0');
    const hours = zona_.getUTCHours().toString().padStart(2, '0');
    const minutes = zona_.getUTCMinutes().toString().padStart(2, '0');
    const seconds = zona_.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = zona_.getUTCMilliseconds().toString().padStart(3, '0');
  
    switch (format) {
      case "year":
        return year;
      case "month":
        return month;
      case "day":
        return day;
      case "hours":
        return hours;
      case "minutes":
        return minutes;
      case "seconds":
        return seconds;
      case "milliseconds":
        return milliseconds;
      default:
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
  }

  getTracingIdWithLength(length: number, request: any, response: any) {
    // const SLO_id = request.transaction_id ? request.transaction_id: new Types.ObjectId();

    const uidLength = length - 3 - 1 - 10 - 1;
    const uid = new ShortUniqueId({ length: uidLength });

    const SLO_id = uid();
    const curr_date = new Date().toISOString().split('T')[0];
    const SLO_tracing_id = `SLO_${curr_date}_${SLO_id.toString()}`;
    const trace_id =
      response.trace_custom_code === 'UND' || !response.trace_custom_code
        ? SLO_tracing_id
        : `${response.trace_custom_code}_${curr_date}_${SLO_id}`;

    return trace_id;
  }

  convertUTCtoGMT7LocalFormat(utcDate: string) {

    const local_time_utc = new Date().toISOString();
    if (!utcDate || utcDate == '') {
      utcDate = local_time_utc;
    }

    // Parse input UTC date string
    const utcDateTime = new Date(utcDate);

    // Get the current time zone offset in minutes
    const utcOffset = utcDateTime.getTimezoneOffset();
    
    // Set the timezone offset for GMT+7 (in minutes)
    const gmt7Offset = 7 * 60; // 7 hours in minutes

    // Calculate the new time considering the offset
    const gmt7DateTime = new Date(utcDateTime.getTime() + (gmt7Offset + utcOffset) * 60000);

    // Manually format the result in the desired format
    const year = gmt7DateTime.getFullYear();
    const month = String(gmt7DateTime.getMonth() + 1).padStart(2, '0');
    const day = String(gmt7DateTime.getDate()).padStart(2, '0');
    const hours = String(gmt7DateTime.getHours()).padStart(2, '0');
    const minutes = String(gmt7DateTime.getMinutes()).padStart(2, '0');
    const seconds = String(gmt7DateTime.getSeconds()).padStart(2, '0');

    const formattedGMT7Date = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedGMT7Date;
  }
}
