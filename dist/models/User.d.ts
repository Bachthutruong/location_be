import mongoose, { Document } from 'mongoose';
export declare enum UserRole {
    ADMIN = "admin",
    STAFF = "staff",
    MANAGER = "manager",
    USER = "user"
}
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map