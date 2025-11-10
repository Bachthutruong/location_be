import mongoose, { Schema } from 'mongoose';
const SettingsSchema = new Schema({
    defaultProvince: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
// Ensure only one settings document exists
SettingsSchema.statics.getOrCreate = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};
const Settings = mongoose.model('Settings', SettingsSchema);
export default Settings;
//# sourceMappingURL=Settings.js.map