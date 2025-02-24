export function convertTimeZonePayload(time=null,tz=null) {
    let trx_date = '';
    const timezone = {
        wib : "07:00",
        wita : "08:00",
        wit : "09:00",
        general : "07:00"
    }

    if(time && tz){
        const time_split = time.split('.');
        trx_date = `${time_split[0]}+${timezone[tz.toLocaleLowerCase()]}`;
    }

    return trx_date;
  }
  