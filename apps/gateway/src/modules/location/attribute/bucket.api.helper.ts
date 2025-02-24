import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDefined, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { SchemaTypes } from "mongoose";

export const ApiOperations = {
    BucketGetAll: {
        summary: 'Get Bucket Data',
        description: "Return bucket data without user's location filter.",
    },
    BucketAdd: {
        summary: 'Add New Bucket Data',
        description: "Add new bucket data.",
    },
    BucketDelete: {
        summary: 'Delete Bucket Data',
        description: "Delete bucket data.",
    },
    BucketBulkDelete: {
        summary: 'Bulk Delete Bucket Data',
        description: "Bulk delete selected bucket data.",
    },
    BucketUpdate: {
        summary: 'Edit Bucket Data',
        description: "Edit bucket data.",
    },
    BucketReadPrime: {
        summary: 'Show all bucket item',
        description: `<table><tr><td>first<br/><i>Offsetofdata</i></td><td>:</td><td><b>number</b></td></tr><tr><td>rows<br/><i>Limitdatainpage</i></td><td>:</td><td><b>number</b></td></tr><tr><td>sortField<br/><i>Fieldtobesort</i></td><td>:</td><td><b>string</b></td></tr><tr><td>sortOrder<br/><i>1isascending.-1isdescending</i></td><td>:</td><td><b>number</b></td></tr><tr><td>filters</td><td>:</td><td><b>object</b><br/><table><tr><td>column_name_1<br/><i>Nameofcolumntobesearched</i></td><td>:</td><td><b>object</b><table><tr><td>matchMode</td><td>:</td><td><b>string</b><br/>Onlyfilledbyfollowingitem:<ul><li><b>contains</b><br/>Willsearchalldataifcolumn_name_1containsthevalue<br/></li><li><b>notContains</b><br/>Willsearchalldataifcolumn_name_1notcontainsthevalue<br/></li><li><b>startsWith</b><br/>Willsearchalldataifcolumn_name_1startswiththevalue<br/></li><li><b>endsWith</b><br/>Willsearchalldataifcolumn_name_1endswiththevalue<br/></li><li><b>equals</b><br/>Willsearchalldataifcolumn_name_1equalstothevalue<br/></li><li><b>notEquals</b><br/>Willsearchalldataifcolumn_name_1notequalstothevalue<br/></li></li></td></tr><tr><td>value</td><td>:</td><td><b>string</b></td></tr></table></td></tr><tr><td>column_name_2<br/><i>Nameofcolumntobesearched</i></td><td>:</td><td><b>object</b><table><tr><td>matchMode</td><td>:</td><td><b>string</b><br/>Onlyfilledbyfollowingitem:<ul><li><b>contains</b><br/>Willsearchalldataifcolumn_name_2containsthevalue<br/></li><li><b>notContains</b><br/>Willsearchalldataifcolumn_name_2notcontainsthevalue<br/></li><li><b>startsWith</b><br/>Willsearchalldataifcolumn_name_2startswiththevalue<br/></li><li><b>endsWith</b><br/>Willsearchalldataifcolumn_name_2endswiththevalue<br/></li><li><b>equals</b><br/>Willsearchalldataifcolumn_name_2equalstothevalue<br/></li><li><b>notEquals</b><br/>Willsearchalldataifcolumn_name_2notequalstothevalue<br/></li></li></td></tr><tr><td>value</td><td>:</td><td><b>string</b></td></tr></table></td></tr></table></td></tr></table>`,
    },
    BucketView: {
        summary: 'View Bucket Data',
        description: "View bucket data by ID.",
    },
};

export class bucketResDTO {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'BUCKET_ADD' })
    @IsString()
    transaction_classify: string;

    @ApiProperty({ example: 'Bucket Created Successfully' })
    @IsString()
    message: string;

    payload: any;
}

export class bucketAddDTO {
    @ApiProperty({
        required: true,
        example: 'Bucket 001',
    })
    @IsNotEmpty()
    @IsDefined()
    @IsString()
    bucket_name: string;

    // -----------------------
    @ApiProperty({
        required: true,
        example: '636de5484a5bee4e15294f48',
        description: 'Lov ID, reference to API (GET: /v1/lov), filter: {"group_name":"BUCKET_TYPE"}'
    })
    @IsNotEmpty()
    @IsDefined()
    @IsString()
    @IsMongoId()
    bucket_type: string;

    // -----------------------
    @ApiProperty({
        required: true,
        example: {
            username: "username (only if LinkAja Bucket Type)",
            secret_key: "secret_key (only if LinkAja Bucket Type)",
            short_code: "short_code (only if NGRS Bucket Type)",
            element1: "element1 (only if NGRS Bucket Type)",
        },
        description:
            `Type your value by bucket type: <br>` +
            `LinkAja (Main) & LinkAja (Bonus) : username & secret_key <br>` +
            `NGRS : short_code`
    })
    @IsNotEmpty()
    @IsDefined()
    @IsObject()
    specify_data: object;

    @ApiProperty({
        required: true,
        example: '63208c59860f4880de169ee8',
        description: 'Pic ID, reference to API (GET: /v1/lov)'
    })
    @IsNotEmpty()
    @IsDefined()
    @IsString()
    @IsMongoId()
    pic: string;
    // -----------------------
    @ApiProperty({
        required: true,
        example: '62ffd9ed1e38fbdeb16f1f53',
        description: 'Location ID, reference to API (GET: /v1/lov)'
    })
    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    location: string;
    
    @ApiProperty({
        required: true,
        example: {
            _id: "62ffd9ed1e38fbdeb16f1f53",
            name: "name"
        },
        description: 'Location ID, reference to API (GET: /v1/lov)'
    })
    @IsNotEmpty()
    @IsObject()
    location_type: object;

    @ApiProperty({
        required: false,
        example: {
            _id: "62ffd9ed1e38fbdeb16f1f53",
            name: "name"
        },
        description: 'Location ID, reference to API (GET: /v1/location)'
    })
    @IsOptional()
    @IsObject()
    location_area_identifier: object;

    @ApiProperty({
        required: false,
        example: {
            _id: "62ffd9ed1e38fbdeb16f1f53",
            name: "name"
        },
        description: 'Location ID, reference to API (GET: /v1/location)'
    })
    @IsOptional()
    @IsObject()
    location_region_identifier: object;
}

export class bucketUpdateParamDTO {
    @ApiProperty({
        required: true,
        description: 'ID of bucket data',
    })
    @IsNotEmpty()
    @IsDefined()
    @IsMongoId()
    @Prop({
        type: SchemaTypes.String,
        required: true
    })
    _id: string;
}

export class bucketUpdateBodyDTO {
    @ApiProperty({
        required: true,
        example: 'Bucket 001',
    })
    @IsNotEmpty()
    @IsDefined()
    @IsString()
    bucket_name: string;

    // -----------------------
    @ApiProperty({
        required: true,
        example: '636de5484a5bee4e15294f48',
        description: 'Lov ID, reference to API (GET: /v1/lov), filter: {"group_name":"BUCKET_TYPE"}'
    })
    @IsNotEmpty()
    @IsDefined()
    @IsString()
    @IsMongoId()
    bucket_type: string;

    // -----------------------
    @ApiProperty({
        required: true,
        example: {
            username: "username (only if LinkAja Bucket Type)",
            secret_key: "secret_key (only if LinkAja Bucket Type)",
            short_code: "short_code (only if NGRS Bucket Type)",
        },
        description:
            `Type your value by bucket type: <br>` +
            `LinkAja (Main) & LinkAja (Bonus) : username & secret_key <br>` +
            `NGRS : short_code`
    })
    @IsNotEmpty()
    @IsDefined()
    @IsObject()
    specify_data: object;

    // -----------------------
    @ApiProperty({
        required: true,
        example: '63208c59860f4880de169ee8',
        description: 'Pic ID, reference to API (GET: /v1/lov)'
    })
    @IsNotEmpty()
    @IsDefined()
    @IsString()
    @IsMongoId()
    pic: string;
    // -----------------------
    @ApiProperty({
        required: false,
        example: '62ffd9ed1e38fbdeb16f1f53',
        description: 'Location ID, reference to API (GET: /v1/lov)'
    })
    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    location: string;

    @ApiProperty({
        required: true,
        example: {
            _id: "62ffd9ed1e38fbdeb16f1f53",
            name: "name"
        },
        description: 'Location ID, reference to API (GET: /v1/lov)'
    })
    @IsNotEmpty()
    @IsObject()
    location_type: object;

    @ApiProperty({
        required: false,
        example: {
            _id: "62ffd9ed1e38fbdeb16f1f53",
            name: "name"
        },
        description: 'Location ID, reference to API (GET: /v1/location)'
    })
    @IsNotEmpty()
    @IsObject()
    location_area_identifier: object;

    @ApiProperty({
        required: false,
        example: {
            _id: "62ffd9ed1e38fbdeb16f1f53",
            name: "name"
        },
        description: 'Location ID, reference to API (GET: /v1/location)'
    })
    @IsNotEmpty()
    @IsObject()
    location_region_identifier: object;
}

export class bucketDeleteParamDTO {
    @ApiProperty({
        required: true,
        description: 'ID of bucket data',
    })
    @IsNotEmpty()
    @IsDefined()
    @IsMongoId()
    @Prop({
        type: SchemaTypes.String,
        required: true
    })
    _id: string;
}

export class bucketBulkDeleteQueryDTO {
    @ApiProperty({
        required: true,
        example: ["bucketID_1", "bucketId_2"],
        description: 'List of ID to be delete',
    })
    @IsNotEmpty()
    @IsDefined()
    @IsArray()
    @Prop({
        type: SchemaTypes.Mixed,
        required: true
    })
    list_id: any;
}

export class bucketGetAllQueryDTO {
    @ApiProperty({
        required: true,
        example: 10,
        description: 'Limit count of rows',
    })
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    @IsDefined()
    @Prop({
        type: SchemaTypes.Number,
        required: true
    })
    limit: number;
}

