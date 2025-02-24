import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsString } from 'class-validator';

export class CampaignAnalyticGetBroadcastDto {
  @ApiProperty({
    type: Array,
    required: false,
    example: ["64082069b4cdabe63a28715e"],
    description: `Filter list of customer tier, input must be ID of tier`,
  })
  @IsArray()
  customer_tier: string[];

  @ApiProperty({
    type: Array,
    required: false,
    example: ["Telkomsel Prepaid","simPATI"],
    description: `Filter list of customer brand`,
  })
  @IsArray()
  customer_brand: string[];

  @ApiProperty({
    type: Array,
    required: false,
    example: ["kecamatan","kabupaten", "region", "area_sales"],
    description: `Filter list of customer location`,
  })
  @IsArray()
  customer_location: string[];

  @ApiProperty({
    type: String,
    required: false,
    example: "",
    description: `Id, please set empty string than null`,
  })
  @IsString()
  customer_location_type: string;

  @ApiProperty({
    type: String,
    required: false,
    example: "",
    description: `Id, please set empty string than null`,
  })
  @IsString()
  customer_location_area_identifier: string;

  @ApiProperty({
    type: String,
    required: false,
    example: "",
    description: `Id, please set empty string than null`,
  })
  @IsString()
  customer_location_region_identifier: string;

  @ApiProperty({
    type: Object,
    required: false,
    example: { operator: "Ranged", value_start: 60, value_end: 100 },
    description: `Filter list of customer los`,
  })
  @IsObject()
  customer_los: object;

  @ApiProperty({
    type: Object,
    required: false,
    example: { value_start: 40, value_range: 60 },
    description: `Filter list of point range of customer`,
  })
  @IsObject()
  poin_range: object;

  @ApiProperty({
    type: Object,
    required: false,
    example: { operator: "EQUAL", name: "Category Name" },
    description: `Filter list of BCP category of customer`,
  })
  @IsObject()
  bcp_category: object;

  @ApiProperty({
    type: Object,
    required: false,
    example: { operator: "EQUAL", name: "Name" },
    description: `Filter list of BCP name of customer`,
  })
  @IsObject()
  bcp_name: object;

}
