export interface QuotaStockAlertDTO {
  program_name: string;
  keyword_name: string;
  locations: any;
  location_name: any;
  stock: any;
  balance: number;
}
export interface QuotaStockPerProgramDTO {
  keyword_name: string;
  locations: any;
  balance: number;
  stock: any;
  program: any;
  keyword: any;
}
