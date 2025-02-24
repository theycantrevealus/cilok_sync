export interface ReportKeywordTransactionDTO {
  created_at: string;
  program_name: string;
  keyword_name: string;
  total_success: number;
  total_fail: number;
  total_trx: number;
}
