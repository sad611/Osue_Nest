import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Object })
  guild: { name: string; ID: string };
  @Prop({ type: Object })
  message: { name: string; ID: string;};
  @Prop({ type: Array })
  roles: { name: string; ID: string };
}

export const MessageSchema = SchemaFactory.createForClass(Message);

export type MessageDocument = Message & Document;
