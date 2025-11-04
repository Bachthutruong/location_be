import mongoose, { Document } from 'mongoose';
export declare enum ReportStatus {
    PENDING = "pending",
    RESOLVED = "resolved",
    REJECTED = "rejected"
}
export interface IReport extends Document {
    location: mongoose.Types.ObjectId;
    category: mongoose.Types.ObjectId;
    description: string;
    reportedBy: mongoose.Types.ObjectId;
    status: ReportStatus;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IReport, {}, {}, {}, mongoose.Document<unknown, {}, IReport, {}, {}> & IReport & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Report.d.ts.map