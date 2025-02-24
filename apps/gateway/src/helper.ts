// Delay function
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generating a random integer
export async function randomInt(min: number, max: number): Promise<number> {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function rangeArray(size: number, startAt = 0) {
  return [...Array(size).keys()].map((i) => i + startAt);
}

// Convert number to text
export async function convNumToText(params) {
  const n = 'abcdefghij';
  let element = '';
  for (let i = 0; i < params.length; i++) {
    element += n[params[i]];
  }
  return element;
}

// Convert text to number
export async function convTextToNum(params) {
  const n = {
    a: '0',
    b: '1',
    c: '2',
    d: '3',
    e: '4',
    f: '5',
    g: '6',
    h: '7',
    i: '8',
    j: '9',
  };
  let element = '';
  for (let i = 0; i < params.length; i++) {
    element += n[params[i]];
  }
  return element;
}

// Remove object key(s) if value is null or empty string
export function objectRemoveEmpty(obj: object) {
  return Object.fromEntries(
    Object.entries(obj)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, v]) => v !== null && v !== '')
      .map(([k, v]) => [k, v === Object(v) ? objectRemoveEmpty(v) : v]),
  );
}

//Split Error Duplicate Name
export function duplicateField(field: any) {
  return `The ${field} you given already exist`;
}

//Convert WITA,WIT to WIB
export function convertToWIB(time: Date,timezone: string){
   // Menentukan selisih waktu antara WIB dengan timezone yang diberikan
   let timeDiff = 0;
   switch (timezone) {
     case "WITA":
       timeDiff = 1;
       break;
     case "WIT":
       timeDiff = 2;
       break;
     default:
       timeDiff = 0;
       break;
   }

   // Menambahkan selisih waktu ke objek Date yang diberikan
   time.setHours(time.getHours() + (7 - timeDiff));

   // Mengembalikan objek Date dengan waktu yang sudah dikonversi ke WIB
   return time;
}

//Set TimeZone UTC (WIB,WITA,WIT)
export function timeZone(timezone: string) {
  switch (timezone) {
    case 'WITA':
      timezone = 'Asia/Makassar';
      break;
    case 'WIT':
      timezone = 'Asia/Jayapura';
      break;
    default:
      timezone = 'Asia/Jakarta';
      break;
  }
  return timezone;
}

export function dateTimeToCronFormat(datetime: Date) {
  const seconds = datetime.getSeconds();
  const minutes = datetime.getMinutes();
  const hours = datetime.getHours();
  const days = datetime.getDate();
  const months = datetime.getMonth();

  return `${seconds} ${minutes} ${hours} ${days} ${months} *`;
}

export function generateRandomStr(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

