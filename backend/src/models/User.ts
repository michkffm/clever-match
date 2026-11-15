import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const locationSchema = new Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    city: { type: String },
  },
  { _id: false }
);

const preferencesSchema = new Schema(
  {
    minAge: { type: Number },
    maxAge: { type: Number },
    danceStyles: { type: [String], default: [] },
    distance: { type: Number },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    authVersion: { type: String, default: '' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    age: { type: Number, min: 18, max: 99 },
    gender: { type: String, enum: ['M', 'W', 'D', 'other'], default: 'other' },
    height: { type: Number, min: 100, max: 250 },
    athleticism: { type: String, enum: ['very-sporty', 'sporty', 'normal', 'not-sporty'], default: 'normal' },
    figure: { type: String, enum: ['slim', 'normal', 'curvy', 'muscular'], default: 'normal' },
    calendar: { type: [Boolean], default: [false, false, false, false, false, false, false] },
    customDances: { type: [String], default: [] },
    danceLevels: { type: [{ danceId: String, level: { type: Number, min: 1, max: 5 } }], default: [] },
    zipCode: { type: String },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    bio: { type: String, default: '' },
    interests: { type: [String], default: [] },
    danceStyles: { type: [String], default: [] },
    profilePhotos: { type: [String], default: [] },
    privateProfile: { type: Boolean, default: false },
    notificationPreferences: {
      messages: { type: Boolean, default: true },
      matches: { type: Boolean, default: true },
      events: { type: Boolean, default: true },
      likes: { type: Boolean, default: false },
    },
    blockedUserIds: { type: [String], default: [] },
    location: { type: locationSchema },
    preferences: { type: preferencesSchema },
    refreshToken: { type: String },
    refreshTokenExpiresAt: { type: Date },
    refreshTokenIp: { type: String },
    refreshTokenUserAgent: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpiresAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const UserModel = model('User', userSchema);
