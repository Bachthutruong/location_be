import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  title: string;
  content: string;
  category: mongoose.Types.ObjectId;
  images: string[];
  author: mongoose.Types.ObjectId;
  published: boolean;
  publishedAt?: Date;
  isCourse?: boolean; // Flag to indicate if this news is a course
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema = new Schema<INews>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'NewsCategory',
      required: true
    },
    images: {
      type: [String],
      default: []
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    published: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    },
    isCourse: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<INews>('News', NewsSchema);

