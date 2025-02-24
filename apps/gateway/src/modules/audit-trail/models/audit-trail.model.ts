import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type AuditTrailDocument = AuditTrail & Document;

@Schema({
  collection: 'audit_trails',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class AuditTrail {
  @Prop({
    required: true,
    type: String,
  })
  user_name: string;

  @Prop({
    required: true,
    type: String,
  })
  menu: string;

  @Prop({
    required: true,
    type: String,
  })
  request_api: string;

  @Prop({
    required: true,
    type: String,
  })
  method: string;

  @Prop({ required: true, type: SchemaTypes.Number })
  status: number;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  json: any;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  additional_param: any;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
}

export const AuditTrailSchema = SchemaFactory.createForClass(AuditTrail);

AuditTrailSchema.index({ user_name: 1 });
AuditTrailSchema.index({ menu: 1 });
AuditTrailSchema.index({ request_api: 1 });
AuditTrailSchema.index({ method: 1 });
AuditTrailSchema.index({ status: 1 });
AuditTrailSchema.index({ additional_param: 1 });
