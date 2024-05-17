import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ type: Object })
  guild: { name: string; ID: string };
  @Prop({ type: Object })
  role: { name: string; ID: string; hex: string };
  @Prop({ type: Object })
  user: { name: string; ID: string };
}

export const RoleSchema = SchemaFactory.createForClass(Role);

export type RoleDocument = Role & Document;
