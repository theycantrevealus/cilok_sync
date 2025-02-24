import { ObjectId } from "bson";

export class CreateOTPData {
  msisdn: string;
  keyword: ObjectId;
  keyword_name: string;
}
