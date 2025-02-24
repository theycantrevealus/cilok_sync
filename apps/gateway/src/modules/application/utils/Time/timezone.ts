const moment = require('moment-timezone');

export class TimeManagement {
  private currentdate;
  private rawDate;
  private timezones: any;

  constructor() {
    this.currentdate = new Date();
    this.rawDate =
      this.currentdate.getDate() +
      '-' +
      (this.currentdate.getMonth() + 1) +
      '-' +
      this.currentdate.getFullYear() +
      ' ' +
      this.currentdate.getHours() +
      ':' +
      this.currentdate.getMinutes() +
      ':' +
      this.currentdate.getSeconds();
  }

  async getTimeRaw() {
    return this.rawDate;
  }

  getTimezone(target) {
    return moment().tz(target).format('L hh:mm:ss');
  }

  getDate(format = 'YYYY-MM-DD') {
    return moment().format(format);
  }

  getTimezoneV2(target) {
    return moment().tz(target).format('YYYY-MM-DDTHH:mm:00.000Z');
  }

  getRangeDate(date) {
    const start = moment(date).format('YYYY-MM-DDT') + '00:00:00.000Z';
    const end = moment(date).format('YYYY-MM-DDT') + '23:59:59.000Z';
    return {
      start: start,
      end: end
    }
  }

  // Get all dates by specific date range
  getDatesInRange(startDate: Date, endDate: Date) {
    const dates = [];

    let currentDate = moment(startDate);
    const stopDate = moment(endDate);
    while (currentDate <= stopDate) {
      dates.push( moment(currentDate).format('YYYY-MM-DD') )
      currentDate = moment(currentDate).add(1, 'days');
    }
    return dates;
  }
}
