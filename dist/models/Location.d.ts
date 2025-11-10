import mongoose, { Document } from 'mongoose';
export declare enum LocationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    DELETED = "deleted"
}
export interface ILocation extends Document {
    name: string;
    category: mongoose.Types.ObjectId;
    province: string;
    district: string;
    street: string;
    address: string;
    phone?: string;
    googleMapsLink: string;
    description: string;
    images: string[];
    manager: mongoose.Types.ObjectId;
    status: LocationStatus;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    deletedAt?: Date;
    latitude?: number;
    longitude?: number;
    featured?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ILocation, {}, {}, {}, mongoose.Document<unknown, {}, ILocation, {}, {}> & ILocation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Location.d.ts.map