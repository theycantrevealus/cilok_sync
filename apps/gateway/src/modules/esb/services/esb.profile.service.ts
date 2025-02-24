import {
  EsbProfileDTO,
  EsbProfileDTOResponse,
} from '@gateway/esb/dtos/esb.profile.dto';
import { Injectable } from '@nestjs/common';

import { EsbProfileIntegration } from '../integration/esb.profile.integration';
@Injectable()
export class EsbProfileService {
  private integration: EsbProfileIntegration;
  constructor(integration: EsbProfileIntegration) {
    this.integration = integration;
  }

  // private generateSignature(): string {
  //   const timestamps = this.generateUnixTimestamp();
  //   return generateMd5(`${this.api_key}${this.api_secret}${timestamps}`);
  // }

  // private generateUnixTimestamp(): number {
  //   const date = new Date();
  //   const timestampInSeconds = Math.floor(date.getTime() / 1000);
  //   return timestampInSeconds;
  // }

  async post(payload: EsbProfileDTO): Promise<EsbProfileDTOResponse> {
    try {
      const data = await this.integration.post(payload);
      return data;
    } catch (error) {
      throw new Error(error);
    }
    // const responseEsb = new EsbProfileDTOResponse();
    // const transactionClassify = EsbTransactionClassifyEnum.dsp_location;
  }
}
