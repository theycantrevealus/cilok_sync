import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class NotificationFirebaseAddDto {
  @ApiProperty({
    required:false,
    example: 'TRX_2023-01-23_63ceaf1d4236e750a2820041',
  })
  @IsString()
  @IsNotEmpty()
  tracing_id: string;

  @ApiProperty({
    required:false,
    example: 'TRX_2023-01-23_63ceaf1d4236e750a2820041',
  })
  @IsString()
  @IsNotEmpty()
  tracing_master_id: string;

  @ApiProperty({
    required:false,
    example: 'Approval Request-Keyword KEYTS004',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    required:false,
    example: 'keyword Creator Name: Mrs. Putri, keyword Period: 23-03-23 s/d 23-04-23, keyword Name: KEYTS004, Program Owner: Head Quarter (HQ), Program Experience: Foodist, Link Detail keyword Setting Page (need to login)',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    required:false,
    example: '63fed03bb4cdabe63af0c530',
  })
  @IsString()
  @IsOptional()
  keyword_id: string;

  @ApiProperty({
    required:false,
    example: '63fed03bb4cdabe63af0c530',
  })
  @IsString()
  @IsOptional()
  program_id: string;


  @ApiProperty({
    required:false,
    example: false,
  })
  @IsBoolean()
  is_read: boolean;

  @ApiProperty({
    required:false,
    example: '63fed03bb4cdabe63af0c530',
  })
  @IsString()
  @IsNotEmpty()
  receiver_id: string;

  @ApiProperty({
    required:false,
    example: 'Mr. Budi',
  })
  @IsString()
  @IsNotEmpty()
  receiver_name: string;

  @ApiProperty({
    required:false,
    example: 'theycantrevealus@gmail.com',
  })
  @IsString()
  @IsNotEmpty()
  receiver_email: string;

  @ApiProperty({
    required:false,
    example: '63fed03bb4cdabe63af0c530',
  })
  @IsString()
  @IsNotEmpty()
  sender_id: string;

  @ApiProperty({
    required:false,
    example: 'Mrs. Putri',
  })
  @IsString()
  @IsNotEmpty()
  sender_name: string;

  @ApiProperty({
    required:false,
    example: 'Mr. Budi',
  })
  @IsObject()
  @IsOptional()
  created_by: any;
}
