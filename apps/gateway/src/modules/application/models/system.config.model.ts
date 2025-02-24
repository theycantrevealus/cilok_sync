import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
export type SystemConfigDocument = SystemConfig & Document;

export class AdditionalValue {
    @Prop({ type: SchemaTypes.String })
    path_local: string;

    @Prop({ type: SchemaTypes.String })
    path_local_exposed: string;
}

@Schema()
export class SystemConfig {
  @Prop({ type: SchemaTypes.String, index: true })
  param_key: string;

  @Prop({ type: SchemaTypes.Mixed })
  param_value: object | string;

  @Prop({ type: SchemaTypes.String })
  path_exposed: string;

  @Prop({ type: SchemaTypes.String })
  description?: string;

  @Prop({ type: AdditionalValue, required: false })
  additional_value?: any;

  constructor(
    param_key?: string,
    param_value?: object | string,
    description?: string,
    path_exposed?: string,
    additional_value?: object
  ) {
    this.param_key = param_key;
    this.param_value = param_value;
    this.description = description;
    this.path_exposed = path_exposed;
    this.additional_value = additional_value;
  }
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
