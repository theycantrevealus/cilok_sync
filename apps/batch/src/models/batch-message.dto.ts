export class RoleDetail {
  _id: string;
  role_id: string;
  __v: number;
  authorizes: any[];
  desc: string;
  name: string;
}

export class LocationDetail {
  code: string;
  name: string;
  type: string;
}

export class AccountLocation {
  __v: number;
  location: string;
  location_detail: LocationDetail;
}

export class Account {
  _id: string;
  user_name: string;
  __v: number;
  created_at: Date;
  deleted_at?: any;
  email: string;
  first_name: string;
  job_level: string;
  job_title: string;
  last_name: string;
  phone: string;
  role: string;
  type: string;
  updated_at: Date;
  user_id: string;
  role_detail: RoleDetail;
  account_location: AccountLocation;
}

export class BatchMessageDto {
  origin: string;
  path: string;
  file: string;
  dir: string;
  token: string;
  account: any;
  batch_id: string;
  send_notification?: boolean;
  identifier: string
}

export class StoreDataRowPayload {
  payload: any;
  data: any;
  id_process: string;
}
