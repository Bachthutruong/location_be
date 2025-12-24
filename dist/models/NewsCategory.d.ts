import mongoose, { Document } from 'mongoose';
export interface INewsCategory extends Document {
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INewsCategory, {}, {}, {}, mongoose.Document<unknown, {}, INewsCategory, {}, {}> & INewsCategory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=NewsCategory.d.ts.map