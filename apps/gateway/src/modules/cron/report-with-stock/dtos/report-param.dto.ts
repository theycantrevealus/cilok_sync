import { CronDataDTO } from './cron-data.dto';
import { ProgramDTO } from './program.dto';

export interface ReportParamDTO {
  date: string;
  program: ProgramDTO;
  data: CronDataDTO;
}
