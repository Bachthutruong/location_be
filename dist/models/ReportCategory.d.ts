import mongoose, { Document } from 'mongoose';
export interface IReportCategory extends Document {
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IReportCategory, {}, {}, {}, mongoose.Document<unknown, {}, IReportCategory, {}, {}> & IReportCategory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ReportCategory.d.ts.map