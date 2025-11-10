import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISettings extends Document {
  defaultProvince?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ISettingsModel extends Model<ISettings> {
  getOrCreate(): Promise<ISettings>;
}

const SettingsSchema = new Schema<ISettings>(
  {
    defaultProvince: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one settings document exists
SettingsSchema.statics.getOrCreate = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);
export default Settings;

