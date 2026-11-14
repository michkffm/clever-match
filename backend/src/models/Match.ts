import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const matchSchema = new Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    type: { type: String, enum: ['like', 'superlike', 'pass'], required: true },
    mutualMatch: { type: Boolean, default: false },
    unmatchedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

matchSchema.index({ actorUserId: 1, targetUserId: 1 }, { unique: true });

export type MatchDocument = HydratedDocument<InferSchemaType<typeof matchSchema>>;

export const MatchModel = model('Match', matchSchema);
