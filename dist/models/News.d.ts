import mongoose, { Document } from 'mongoose';
export interface INews extends Document {
    title: string;
    content: string;
    category: mongoose.Types.ObjectId;
    images: string[];
    author: mongoose.Types.ObjectId;
    published: boolean;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INews, {}, {}, {}, mongoose.Document<unknown, {}, INews, {}, {}> & INews & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=News.d.ts.map