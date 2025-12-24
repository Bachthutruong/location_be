import mongoose, { Document, Schema } from 'mongoose';

export interface INewsCategory extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsCategorySchema = new Schema<INewsCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<INewsCategory>('NewsCategory', NewsCategorySchema);

