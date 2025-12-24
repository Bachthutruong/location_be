import mongoose, { Document } from 'mongoose';
export interface IUserMenu extends Document {
    user: mongoose.Types.ObjectId;
    menu: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUserMenu, {}, {}, {}, mongoose.Document<unknown, {}, IUserMenu, {}, {}> & IUserMenu & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=UserMenu.d.ts.map