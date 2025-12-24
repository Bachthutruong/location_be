import mongoose, { Document } from 'mongoose';
export interface IMenu extends Document {
    name: string;
    link: string;
    parent?: mongoose.Types.ObjectId;
    order: number;
    isGlobal: boolean;
    userId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IMenu, {}, {}, {}, mongoose.Document<unknown, {}, IMenu, {}, {}> & IMenu & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Menu.d.ts.map