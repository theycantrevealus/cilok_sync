import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
export type SystemConfigDocument = SystemConfig & Document;

@Schema()
export class SystemConfig {
  @Prop({ type: SchemaTypes.String })
  param_key: string;

  @Prop({ type: SchemaTypes.Mixed })
  param_value: object | string;

  @Prop({ type: SchemaTypes.String })
  desctiption: string;

  constructor(
    param_key?: string,
    param_value?: object | string,
    description?: string,
  ) {
    this.param_key = param_key;
    this.param_value = param_value;
    this.desctiption = description;
  }
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
