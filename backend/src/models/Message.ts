import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    matchId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    deletedFor: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type MessageDocument = HydratedDocument<InferSchemaType<typeof messageSchema>>;

export const MessageModel = model('Message', messageSchema);
