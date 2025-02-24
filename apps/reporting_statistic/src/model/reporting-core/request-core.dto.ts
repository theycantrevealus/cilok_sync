export class RequestCoreQuery {
  channel?: string;
  date?: string;
  period_type?: string;
  from?: string;
  to?: string;
  // realm_id?: string;
  // branch_id?: string;
  merchant_id?: string;

  buildQuery(): string {
    const queryString = [];

    const keys = Object.keys(this);
    for (const key of keys) {
      queryString.push(`${key}=${this[key]}`);
    }

    return queryString.join('&');
  }
}

export class RequestCoreDto {
  path?: string;
  service?: string;
  body?: any;
  params?: any;
  query?: RequestCoreQuery;
  token: string;
}

export class RequestCoreToken {
  token: string;
}

export class RequestCoreTotalRedeemer extends RequestCoreToken {
  date: string;
  channel?: string;
}

export class RequestCoreTotalRedeemerRevenue extends RequestCoreToken {
  date: string;
  channel?: string;
}

export class RequestCoreTotalEarner extends RequestCoreToken {
  date: string;
}

export class RequestCorePointEarn extends RequestCoreToken {
  date: string;
}

export class RequestCoreGrossRevenue extends RequestCoreToken {
  date: string;
}
