import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const organizerSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    time: { type: String },
    location: { type: String, required: true },
    category: { type: String, enum: ['singles'], index: true },
    danceStyle: { type: String },
    organizer: { type: organizerSchema, required: true },
    attendeeIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type EventDocument = HydratedDocument<InferSchemaType<typeof eventSchema>>;

export const EventModel = model('Event', eventSchema);
