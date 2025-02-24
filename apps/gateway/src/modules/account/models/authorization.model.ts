import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';
export type AuthorizationDocument = Authorization & Document;

@Schema()
export class Authorization {
  @Prop({
    type: SchemaTypes.String,
    unique: true,
  })
  @IsNotEmpty()
  @IsString()
  url: string;

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  role: string;

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  permission: string;

  constructor(url?: string, role?: string) {
    this.url = url;
    this.role = role;
  }
}

export const AuthorizationSchema = SchemaFactory.createForClass(Authorization);
