import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';

import { CreateOTPData } from '../models/otp.dto';
import { OTP, OTPDocument } from '../models/otp.model';

@Injectable()
export class OTPService {
  constructor(
    @InjectModel(OTP.name)
    private otpModel: Model<OTPDocument>,

    private appsService: ApplicationService,
  ) {}

  async otpDetail(msisdn: string, otp: string): Promise<any> {
    const otpData = await this.otpModel
      .findOne({
        otp,
        msisdn,
      })
      .lean();

    return otpData;
  }

  async claimOTP(msisdn: string, otp: string): Promise<any> {
    const now = new Date();
    const otpData = await this.otpModel
      .findOne({
        otp,
        msisdn,
        claimed_at: null,
        expired_at: { $gte: now },
      })
      .lean();

    if (otpData) {
      await this.otpModel.updateOne({ otp, msisdn }, { claimed_at: now });
    } else {
      return null;
    }

    return otpData;
  }

  async createOTP(otpData: CreateOTPData): Promise<any> {
    const now = new Date();

    // Use existing OTP if exists
    let otp: any = await this.otpModel
      .findOne({
        msisdn: otpData.msisdn,
        claimed_at: null,
        expired_at: { $gte: now },
        keyword: otpData.keyword,
      })
      .lean();

    if (otp) {
      return otp;
    }

    const expdursec = await this.appsService.getConfig(
      'DEFAULT_OTP_EXPIRE_DURATION',
    );
    const otplen = await this.appsService.getConfig('DEFAULT_OTP_DIGIT_LENGTH');

    otp = new this.otpModel({
      ...otpData,
      otp: await this.generateNumericalOTP(otplen),
      expired_at: new Date(now.getTime() + Number(expdursec) * 1000),
      issued_at: now,
    });

    return await new this.otpModel(otp).save();
  }

  private async generateNumericalOTP(length: number) {
    const chars = '0123456789';

    let otp = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      const randomChar = chars.charAt(randomIndex);

      otp += randomChar;
    }

    return otp;
  }
}
