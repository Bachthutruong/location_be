import mongoose, { Document } from 'mongoose';
export interface ICourseRegistration extends Document {
    news: mongoose.Types.ObjectId;
    name: string;
    email: string;
    phone: string;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICourseRegistration, {}, {}, {}, mongoose.Document<unknown, {}, ICourseRegistration, {}, {}> & ICourseRegistration & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=CourseRegistration.d.ts.map