import { CronDataDTO } from './cron-data.dto';
import { ReportDTO } from './report.dto';

export interface ReportParamDTO {
  date: string;
  report: ReportDTO;
  data: CronDataDTO;
}
