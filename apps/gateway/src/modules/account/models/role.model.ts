import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
export type RoleDocument = Role & Document;

@Schema()
export class Role {
  @Prop({ type: SchemaTypes.String })
  role_id: string;

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  desc: string;

  @Prop({ type: SchemaTypes.Array })
  authorizes: [];

  @Prop({ type: SchemaTypes.String })
  status: string;

  constructor(
    role_id?: string,
    name?: string,
    desc?: string,
    authorizes?: [],
    status?: string,
  ) {
    this.role_id = role_id;
    this.name = name;
    this.desc = desc;
    this.authorizes = authorizes;
    this.status = status;
  }
}

export const RoleSchema = SchemaFactory.createForClass(Role);
