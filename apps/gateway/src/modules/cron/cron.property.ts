import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsNumber, IsObject, IsString } from "class-validator";
import { SchemaTypes } from "mongoose";

export const CronApiOperations = {
  TestSftpGeneralCronjob: {
    summary: 'Test Sftp General Cronjob',
    description: "Endpoint for Test Sftp General Cronjob",
  },
  EditCronjobData: {
    summary: 'Edit Specific Cronjob Data',
    description: "Edit config of specific data",
  },
  EditCronjobConfig: {
    summary: 'Edit Specific Cronjob Config',
    description: "Edit config of specific cronjob",
  },
  GetAllCronjobConfigByKey: {
    summary: 'Get Specific Cronjob Config',
    description: "All config of specific cronjob",
  },
  GetAllCronjobConfig: {
    summary: 'Get All Config Of Cronjob List',
    description: "All config of cronjob registered",
  },
  GetAllCronjob: {
    summary: 'Get All Cronjob List',
    description: "All cronjob registered",
  },
};

export class CronResDTO {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'GET CRONJOB KEYWORD EXPIRED ALERT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}

export class cronGetConfigByKeyParam {
  @ApiProperty({
    required: true,
    description: 'Key of cron, check in "(GET) /cronjob" endpoint ',
  })
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true
  })
  key: string;
}

export class cronEditConfigBodyDTO {
  @ApiProperty({
    required: true,
    example: {
      "cronjob_name": "SAMPLE_NAME",
      "running": true,
      "interval": "* * * * * *"
    },
    description: `Refer to this <a href="https://crontab.guru" target="_blank">link</a> for interval conversion.`
  })
  @IsNotEmpty()
  @IsDefined()
  @IsObject()
  config: object;

}

export class cronEditDataBodyDTO {
  @ApiProperty({
    required: true,
    example: {
      "cronjob_name": "SAMPLE_NAME",
      "threshold": 1,
      "email_recipient": [
        'recipient1@email.com',
        'recipient2@email.com',
      ],
    },
    description: `Data can be contain as needed`
  })
  @IsDefined()
  @IsObject()
  data: object;

}
