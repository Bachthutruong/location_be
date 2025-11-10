import { Document, Model } from 'mongoose';
export interface ISettings extends Document {
    defaultProvince?: string;
    createdAt: Date;
    updatedAt: Date;
}
interface ISettingsModel extends Model<ISettings> {
    getOrCreate(): Promise<ISettings>;
}
declare const Settings: ISettingsModel;
export default Settings;
//# sourceMappingURL=Settings.d.ts.map