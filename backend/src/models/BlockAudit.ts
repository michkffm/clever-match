import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const blockAuditSchema = new Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    action: { type: String, enum: ['block', 'unblock'], required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type BlockAuditDocument = HydratedDocument<InferSchemaType<typeof blockAuditSchema>>;

export const BlockAuditModel = model('BlockAudit', blockAuditSchema);
