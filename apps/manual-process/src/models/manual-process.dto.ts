import {Account} from "@/account/models/account.model";


export class ProcessDataRowPayload {
  transaction: string;
  topic: string;
  payload: any;
  parameters: DataRowParameters | GoogleTrxParameters | TransferPulsaParameters;
  data: any;
  id_process: string;
}

export class DataRowParameters {
  origin: string;
  account: any;
  token: string;
  path: string;
  next_topic: string;
}

export class TransferPulsaParameters {
  origin: string;
  account: any;
  token: string;
  path: string;
  next_topic: string;
}

export class GoogleTrxParameters {
  origin: string;
  account: any;
  token: string;
  path: string;

  next_topic: string;   // forward to next_topic after process data
  filter_config: Array<any>;
  criteria: GoogleTrxCriteria;
}

export class GoogleTrxCriteria {
  type: GoogleTrxCriteriaValue;
  start_value: number;
  end_value: number;
}


export enum GoogleTrxCriteriaValue {
  POIN_RANGE = "poin_range",
  MULTIPLE = "multiple"
}
