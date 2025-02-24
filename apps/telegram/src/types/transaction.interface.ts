export interface Transaction {
  date: string;
  keyword: string;
  ytd: {
    unique_redeemer: number;
    trx: number;
    point_burned: number;
  };
  mtd: {
    unique_redeemer: number;
    trx: number;
    point_burned: number;
  };
  today: {
    unique_redeemer: number;
    trx: number;
    point_burned: number;
  };
}
